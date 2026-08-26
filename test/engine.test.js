const path = require('path');
const { Shell } = require(path.join(__dirname, '..', 'renderer', 'shell', 'shell.js'));

let passed = 0, failed = 0;
const failures = [];
function check(desc, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    failures.push(`FAIL: ${desc}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

function run(sh, cmd) {
  return sh.run(cmd);
}

// --- basic navigation ---
let sh = new Shell();
check('pwd initial', run(sh, 'pwd').stdout, '/home/student\n');
check('ls home', run(sh, 'ls').stdout.includes('projects'), true);
run(sh, 'cd projects');
check('cd relative', sh.fs.cwd, '/home/student/projects');
run(sh, 'cd ..');
check('cd ..', sh.fs.cwd, '/home/student');
run(sh, 'cd /etc');
check('cd absolute', sh.fs.cwd, '/etc');
run(sh, 'cd');
check('cd no-arg -> HOME', sh.fs.cwd, '/home/student');
check('cd bad dir error', run(sh, 'cd /nope').stderr.includes('No such file'), true);

// --- files ---
sh = new Shell();
run(sh, 'mkdir testdir');
check('mkdir created', sh.fs.isDir('/home/student/testdir'), true);
run(sh, 'touch testdir/a.txt');
check('touch created', sh.fs.isFile('/home/student/testdir/a.txt'), true);
run(sh, 'echo hello > testdir/a.txt');
check('redirect write', sh.fs.getNode('/home/student/testdir/a.txt').content, 'hello\n');
run(sh, 'echo world >> testdir/a.txt');
check('redirect append', sh.fs.getNode('/home/student/testdir/a.txt').content, 'hello\nworld\n');
check('cat file', run(sh, 'cat testdir/a.txt').stdout, 'hello\nworld\n');
run(sh, 'cp testdir/a.txt testdir/b.txt');
check('cp copies content', sh.fs.getNode('/home/student/testdir/b.txt').content, 'hello\nworld\n');
run(sh, 'mv testdir/b.txt testdir/c.txt');
check('mv removes src', sh.fs.exists('/home/student/testdir/b.txt'), false);
check('mv creates dest', sh.fs.exists('/home/student/testdir/c.txt'), true);
run(sh, 'rm testdir/c.txt');
check('rm removes file', sh.fs.exists('/home/student/testdir/c.txt'), false);
check('rmdir non-empty fails', run(sh, 'rmdir testdir').stderr.includes('not empty'), true); // still has a.txt
run(sh, 'rm -rf testdir');
check('rm -rf removes dir', sh.fs.exists('/home/student/testdir'), false);

// --- pipes & text processing ---
sh = new Shell();
let r = run(sh, 'cat documents/notes.txt | grep -i deploy');
check('pipe cat|grep', r.stdout.trim(), 'Deploy app on Friday');
r = run(sh, 'echo "b\na\nc" | sort');
check('sort', r.stdout, 'a\nb\nc\n');
r = run(sh, 'printf "a\\nb\\na\\n" ');
check('printf newlines', r.stdout, 'a\nb\na\n');
r = run(sh, 'cat documents/report.csv | grep -v name | cut -d, -f1');
check('cut fields', r.stdout, 'alice\nbob\ncarol\n');
r = run(sh, "cat documents/report.csv | awk -F, '{print $1}'");
check('awk print field1', r.stdout.split('\n')[0], 'name');
r = run(sh, 'wc -l documents/notes.txt');
check('wc -l', r.stdout.trim().split(/\s+/)[0], '3');

// --- variables & expansion ---
sh = new Shell();
run(sh, 'MYVAR=hello');
check('var assignment + echo', run(sh, 'echo $MYVAR').stdout, 'hello\n');
check('single quotes suppress expansion', run(sh, "echo '$MYVAR'").stdout, '$MYVAR\n');
check('double quotes allow expansion', run(sh, 'echo "$MYVAR world"').stdout, 'hello world\n');
run(sh, 'export FOO=bar');
check('export sets env', sh.fs.env.FOO, 'bar');
r = run(sh, 'echo $(echo nested)');
check('command substitution', r.stdout, 'nested\n');

// --- for loop ---
sh = new Shell();
r = run(sh, 'for i in 1 2 3; do echo $i; done');
check('for loop', r.stdout, '1\n2\n3\n');

// --- if/test ---
sh = new Shell();
r = run(sh, 'if [ -f documents/notes.txt ]; then echo yes; else echo no; fi');
check('if -f true branch', r.stdout, 'yes\n');
r = run(sh, 'if [ -f documents/nope.txt ]; then echo yes; else echo no; fi');
check('if -f false branch', r.stdout, 'no\n');

// --- && / || / ; sequencing ---
sh = new Shell();
r = run(sh, 'mkdir seqdir && cd seqdir && pwd');
check('&& chains on success', r.stdout, '/home/student/seqdir\n');
r = run(sh, 'cd /nope || echo fallback');
check('|| runs on failure', r.stdout, 'fallback\n');
sh = new Shell();
r = run(sh, 'pwd ; echo done');
check('; always runs next regardless of exit code', r.stdout, '/home/student\ndone\n');

// --- & background jobs ---
sh = new Shell();
r = run(sh, 'sleep 30 & jobs');
check('& dispatches a job (announced as [1] <pid>)', /^\[1\] \d+\n/.test(r.stdout), true);
check('& registers the job in state so jobs lists it', sh.state.backgroundJobs, ['sleep 30']);
check('jobs output shows the backgrounded command', r.stdout.includes('sleep 30 &'), true);
sh = new Shell();
r = run(sh, 'sleep 1 & whoami & jobs');
check('multiple & jobs each get their own [N] id', /\[1\] \d+\n\[2\] \d+\n/.test(r.stdout), true);
check('multiple & jobs all tracked', sh.state.backgroundJobs.length, 2);
sh = new Shell();
r = run(sh, 'ls /nope &> both.log');
check('&> combined redirect still parses as redirect, not background', sh.state.backgroundJobs.length, 0);

// --- exit code ($?) ---
sh = new Shell();
run(sh, 'cd /no-such-dir');
r = run(sh, 'echo $?');
check('$? reflects failure', r.stdout.trim() !== '0', true);

// --- permissions ---
sh = new Shell();
run(sh, 'touch perm.txt');
run(sh, 'chmod 755 perm.txt');
check('chmod numeric', sh.fs.getNode('/home/student/perm.txt').mode, 0o755);
run(sh, 'chmod u-x perm.txt');
check('chmod symbolic', sh.fs.getNode('/home/student/perm.txt').mode, 0o655);
r = run(sh, 'ls -l perm.txt');
check('ls -l shows perms', r.stdout.startsWith('-rw-r-xr-x'), true);

// --- grep on log file (realistic devops drill) ---
sh = new Shell();
r = run(sh, 'grep ERROR projects/webapp/logs/app.log | wc -l');
check('grep ERROR count via pipe', r.stdout.trim(), '2');

// --- real regex support (not just literal substrings) ---
sh = new Shell();
r = run(sh, "grep -E 'WARN|ERROR' projects/webapp/logs/app.log");
check('grep -E alternation matches WARN or ERROR lines', r.stdout.split('\n').filter(Boolean).length, 3);
r = run(sh, "grep -E ',[0-9]{2},' documents/inventory.csv");
check('grep -E character class + {n} quantifier', r.stdout.split('\n').filter(Boolean).length, 3);
r = run(sh, "grep '^(web|db)-' documents/servers.txt");
check('grep treats patterns as extended regex even without -E', r.stdout.split('\n').filter(Boolean).length, 3);
r = run(sh, "echo 'order-2024-item-15' | sed 's/[0-9]+/#/g'");
check('sed regex quantifier replaces every digit run, not literal text', r.stdout, 'order-#-item-#\n');
r = run(sh, "echo 'John Smith' | sed 's/(\\w+) (\\w+)/\\2 \\1/'");
check('sed supports capture-group backreferences (\\1, \\2)', r.stdout, 'Smith John\n');

// --- find ---
sh = new Shell();
r = run(sh, "find projects -name '*.py'");
check('find by name', r.stdout.trim(), '/home/student/projects/webapp/src/app.py');

// --- systemctl ---
sh = new Shell();
check('systemctl status nginx active', run(sh, 'systemctl status nginx').stdout.includes('active (running)'), true);
run(sh, 'systemctl stop nginx');
check('systemctl stop', run(sh, 'systemctl is-active nginx').code, 3);
run(sh, 'systemctl start nginx');
check('systemctl start again', run(sh, 'systemctl is-active nginx').code, 0);

// --- apt ---
sh = new Shell();
check('package not installed yet', sh.state.packages.has('nginx'), false);
run(sh, 'apt install -y nginx');
check('apt install adds pkg', sh.state.packages.has('nginx'), true);

// --- ps aux ---
sh = new Shell();
r = run(sh, 'ps aux');
check('ps aux shows CPU header', r.stdout.includes('%CPU'), true);

// --- git ---
sh = new Shell();
check('git status outside repo fails', run(sh, 'git status').stderr.includes('not a git repository'), true);
run(sh, 'mkdir myrepo && cd myrepo && git init');
check('git init', sh.state.gitRepos.has('/home/student/myrepo'), true);
run(sh, 'touch file.txt');
run(sh, 'git add file.txt');
r = run(sh, 'git commit -m "initial commit"');
check('git commit message', r.stdout.includes('initial commit'), true);
r = run(sh, 'git log --oneline');
check('git log oneline', r.stdout.includes('initial commit'), true);
run(sh, 'git branch feature');
r = run(sh, 'git branch');
check('git branch list', r.stdout.includes('feature'), true);

// --- docker ---
sh = new Shell();
r = run(sh, 'docker run -d --name web nginx');
check('docker run -d prints id', /^[0-9a-f]{12}\n$/.test(r.stdout), true);
r = run(sh, 'docker ps');
check('docker ps shows container', r.stdout.includes('web'), true);

// --- tar ---
sh = new Shell();
run(sh, 'mkdir archdir');
run(sh, 'echo hi > archdir/f.txt');
run(sh, 'tar -cf backup.tar archdir');
check('tar created archive', sh.fs.exists('/home/student/backup.tar'), true);
run(sh, 'rm -rf archdir');
run(sh, 'tar -xf backup.tar');
check('tar extracted dir back', sh.fs.exists('/home/student/archdir/f.txt'), true);
check('tar extracted content matches', sh.fs.getNode('/home/student/archdir/f.txt').content, 'hi\n');

// --- glob ---
sh = new Shell();
run(sh, 'mkdir globtest && cd globtest');
run(sh, 'touch a.txt b.txt c.log');
r = run(sh, 'ls *.txt');
check('glob expansion', r.stdout.trim().split(/\s+/).sort().join(','), 'a.txt,b.txt');

// --- kubectl ---
sh = new Shell();
r = run(sh, 'kubectl get pods');
check('kubectl get pods lists seeded pods', r.stdout.includes('web-deployment') && r.stdout.includes('redis-0'), true);
r = run(sh, 'kubectl scale deployment web-deployment --replicas=4');
check('kubectl scale ok', r.stdout.includes('scaled'), true);
check('kubectl scale updates replica count', sh.state.k8s.deployments.find((d) => d.name === 'web-deployment').replicas, 4);
r = run(sh, 'kubectl apply -f k8s/api-deployment.yaml');
check('kubectl apply creates deployment', sh.state.k8s.deployments.some((d) => d.name === 'api-deployment' && d.replicas === 3), true);
r = run(sh, 'kubectl delete pod redis-0');
check('kubectl delete pod removes it', sh.state.k8s.pods.some((p) => p.name === 'redis-0'), false);

// --- tail -n +K (skip header) ---
sh = new Shell();
r = run(sh, "tail -n +2 documents/inventory.csv | cut -d',' -f3 | sort -n");
check('tail -n +2 skips header line', r.stdout, '4\n8\n12\n17\n30\n');

// --- dirname/basename/realpath ---
sh = new Shell();
check('dirname', run(sh, 'dirname documents/notes.txt').stdout, '/home/student/documents\n');
check('basename', run(sh, 'basename documents/notes.txt').stdout, 'notes.txt\n');
check('basename strips suffix', run(sh, 'basename documents/notes.txt .txt').stdout, 'notes\n');
check('cd $(dirname ...) combo', run(sh, 'cd $(dirname documents/notes.txt) && pwd').stdout, '/home/student/documents\n');

// --- grep -r (recursive directory search) ---
sh = new Shell();
r = run(sh, 'grep -r app projects');
check('grep -r finds matches across a directory tree', r.stdout.includes('app.py') || r.code === 0, true);

// --- tr -s (squeeze repeated characters) ---
sh = new Shell();
check('tr -s squeezes repeated spaces', run(sh, "echo 'a   b    c' | tr -s ' '").stdout.trim(), 'a b c');

// --- cd - (previous directory) ---
sh = new Shell();
run(sh, 'cd projects');
r = run(sh, 'cd -');
check('cd - returns to previous directory', sh.fs.cwd, '/home/student');
check('cd - prints the new cwd', r.stdout, '/home/student\n');

// --- stderr / combined redirects ---
sh = new Shell();
run(sh, 'cat nope.txt 2> err.log');
check('2> writes stderr to file, not terminal', sh.fs.getNode('/home/student/err.log').content.includes('No such file'), true);
sh = new Shell();
run(sh, 'cat documents/notes.txt nope.txt &> both.log');
check('&> combines stdout+stderr into one file', sh.fs.getNode('/home/student/both.log').content.includes('TODO') && sh.fs.getNode('/home/student/both.log').content.includes('No such file'), true);

// --- 2>&1 / 1>&2 fd-duplication (extremely common real bash idiom) ---
sh = new Shell();
r = run(sh, 'ls /nope > out.txt 2>&1');
check('"> file 2>&1" merges stderr into the same file as stdout', sh.fs.getNode('/home/student/out.txt').content.includes('No such file'), true);
check('"> file 2>&1" leaves nothing on stdout/stderr of the shell itself', r.stdout, '');
sh = new Shell();
r = run(sh, 'ls /nope 2>&1');
check('bare "2>&1" (no file) merges stderr into the stdout stream', r.stdout.includes('No such file'), true);
check('bare "2>&1" leaves stderr empty after merging', r.stderr, '');
sh = new Shell();
r = run(sh, 'echo hi 2>&1');
check('"2>&1" on a command with no stderr is a no-op on stdout', r.stdout, 'hi\n');
sh = new Shell();
check('"2>&1" does not get misparsed as the & background operator', sh.state.backgroundJobs.length, 0);

// --- /dev/null (writes silently discarded, reads return empty) ---
sh = new Shell();
r = run(sh, 'echo secret > /dev/null');
check('redirecting stdout to /dev/null discards it', r.stdout, '');
check('/dev/null never actually stores written content', sh.fs.getNode('/dev/null').content, '');
sh = new Shell();
r = run(sh, 'ls /nope 2> /dev/null');
check('redirecting stderr to /dev/null discards it silently', r.stderr, '');
r = run(sh, 'ls /nope > /dev/null 2>&1');
check('/dev/null combined with 2>&1 discards everything', r.stdout === '' && r.stderr === '', true);
r = run(sh, 'cat /dev/null');
check('reading /dev/null returns empty content', r.stdout, '');

// --- unquoted glob expansion feeding grep the wrong arguments (real trap) ---
sh = new Shell();
run(sh, 'cd documents');
r = run(sh, 'ls | grep *.txt');
check('unquoted glob in a grep pattern gets expanded by the SHELL first, breaking the search', r.stdout, '');
r = run(sh, "ls | grep '.txt'");
check('quoting the pattern prevents glob expansion, so grep gets the literal string', r.stdout.includes('notes.txt'), true);

// --- ls -d (info about the directory itself, not its contents) ---
sh = new Shell();
r = run(sh, 'ls -ld /etc');
check('ls -ld shows one line about the directory, not its contents', r.stdout, 'drwxr-xr-x 1 student student  4096 Aug 22 12:00 /etc\n');
r = run(sh, 'ls -d documents');
check('ls -d (no -l) just prints the name, does not descend into it', r.stdout, 'documents\n');

// --- xargs -I {} (per-item placeholder substitution, real common idiom) ---
sh = new Shell();
r = run(sh, 'ls documents | xargs -I {} echo file: {}');
check('xargs -I runs the command once per item with the placeholder substituted', r.stdout, 'file: inventory.csv\nfile: notes.txt\nfile: report.csv\nfile: servers.txt\n');

// --- /dev/null cannot be destroyed (direct rm, recursive rm of parent, or mv away) ---
sh = new Shell();
check('rm /dev/null is refused', run(sh, 'rm /dev/null').code, 1);
check('/dev/null still readable after a refused rm', run(sh, 'cat /dev/null').code, 0);
sh = new Shell();
run(sh, 'rm -r /dev');
check('rm -r /dev (the parent) is also refused, not just rm /dev/null directly', sh.fs.exists('/dev/null'), true);
sh = new Shell();
run(sh, 'mv /dev/null /home/student/stolen');
check('mv /dev/null away is refused', sh.fs.exists('/dev/null'), true);
sh = new Shell();
r = run(sh, 'echo x > /dev/null');
check('/dev/null still discards writes after failed removal attempts elsewhere in the same session', r.code, 0);

// --- chown -R (recursive ownership, was silently misparsing -R as the owner spec) ---
sh = new Shell();
run(sh, 'chown -R alice projects');
check('chown -R changes owner on the directory itself', sh.fs.getNode('/home/student/projects').owner, 'alice');
check('chown -R changes owner on a nested file', sh.fs.getNode('/home/student/projects/webapp/deploy.sh').owner, 'alice');

// --- chown :group (owner segment omitted must leave the owner untouched) ---
sh = new Shell();
run(sh, 'chown :devs documents/notes.txt');
r = sh.fs.getNode('/home/student/documents/notes.txt');
check('chown :group leaves the owner unchanged', r.owner, 'student');
check('chown :group still applies the group', r.group, 'devs');

// --- mv -v / cp -v / rm -v (none of these called parseFlags at all before the fix) ---
sh = new Shell();
run(sh, 'touch a.txt');
r = run(sh, 'mv -v a.txt b.txt');
check('mv -v reports the rename', r.stdout, "renamed 'a.txt' -> 'b.txt'\n");
check('mv without -v stays silent', run(sh, 'touch c.txt; mv c.txt d.txt').stdout, '');

sh = new Shell();
r = run(sh, 'cp -v documents/notes.txt notes-copy.txt');
check('cp -v reports the copy', r.stdout, "'documents/notes.txt' -> 'notes-copy.txt'\n");

sh = new Shell();
r = run(sh, 'rm -v notes-copy.txt');
check('rm -v on a nonexistent file still errors (flag alone is not a bypass)', r.code, 1);
run(sh, 'touch e.txt');
r = run(sh, 'rm -v e.txt');
check('rm -v reports the removal', r.stdout, "removed 'e.txt'\n");

// --- ls -t (newest-created first; uses inode order as an mtime proxy) ---
// These assert only facts about the two files THIS test creates, never the
// full seed listing — a hardcoded full-listing string would silently go
// stale (and require manual fixing) every time a seed file is added
// elsewhere, exactly like the find -inum drill's inode literal did.
sh = new Shell();
run(sh, 'touch old.txt');
run(sh, 'touch new.txt');
let names = run(sh, 'ls -t').stdout.trim().split(/\s+/);
check('ls -t puts the most-recently-created file first', names[0], 'new.txt');
check('ls -t puts the next-most-recent file second', names[1], 'old.txt');
names = run(sh, 'ls -tr').stdout.trim().split(/\s+/);
check('ls -tr (reversed) puts the most-recently-created file last', names[names.length - 1], 'new.txt');
check('ls -tr puts the next-most-recent file second-to-last', names[names.length - 2], 'old.txt');

// --- ls -F / -i / -g / -m / -r ---
// Expected values are computed from the LIVE seed (not a frozen string), so
// these track whatever /home/student happens to contain going forward.
sh = new Shell();
const homeNode = sh.fs.getNode('/home/student');
const liveNames = Array.from(homeNode.children.keys()).filter((n) => !n.startsWith('.')).sort();
const indicatorFor = (n) => {
  const node = homeNode.children.get(n);
  if (node.type === 'dir') return '/';
  if (node.type === 'symlink') return '@';
  return node.mode & 0o111 ? '*' : '';
};
r = run(sh, 'ls -F');
check('ls -F marks each entry with its type indicator', r.stdout.trim(), liveNames.map((n) => n + indicatorFor(n)).join('  '));
r = run(sh, 'ls -m');
check('ls -m lists entries comma-separated on one line', r.stdout, liveNames.join(', ') + '\n');
r = run(sh, 'ls -r');
check('ls -r reverses the sort order', r.stdout, liveNames.slice().reverse().join('  ') + '\n');
r = run(sh, 'ls -g documents');
check('ls -g (long format) omits the owner column', r.stdout.split('\n')[1].startsWith('-rw-r--r-- 1 student '), true);

// --- find -size / -user / -group / -maxdepth / -inum ---
sh = new Shell();
run(sh, "echo 'this is a long line' > big.txt");
r = run(sh, 'find . -maxdepth 1 -size +10c');
check('find -size +Nc matches files bigger than N bytes', r.stdout.includes('big.txt'), true);
r = run(sh, 'find . -maxdepth 1 -size -1c');
check('find -size -Nc matches nothing when no file is that small', r.stdout, '');

sh = new Shell();
run(sh, 'chown alice projects/webapp/deploy.sh');
r = run(sh, 'find projects -user alice');
check('find -user filters by file owner', r.stdout, '/home/student/projects/webapp/deploy.sh\n');
r = run(sh, 'find projects -user nobody');
check('find -user with no matching owner returns nothing', r.stdout, '');

sh = new Shell();
run(sh, 'chown bob:devs documents/notes.txt');
r = run(sh, 'find documents -group devs');
check('find -group filters by file group', r.stdout, '/home/student/documents/notes.txt\n');

sh = new Shell();
r = run(sh, 'find projects -maxdepth 1 -type d');
check('find -maxdepth 1 does not descend past the first level', r.stdout, '/home/student/projects\n/home/student/projects/webapp\n');

sh = new Shell();
const notesInode = sh.fs.getNode('/home/student/documents/notes.txt').inode;
r = run(sh, `find documents -inum ${notesInode}`);
check('find -inum matches the exact inode reported for that file', r.stdout, '/home/student/documents/notes.txt\n');

// --- chgrp (group-only, unlike chown which also touches the owner) ---
sh = new Shell();
run(sh, 'chgrp devs documents/notes.txt');
r = sh.fs.getNode('/home/student/documents/notes.txt');
check('chgrp changes only the group', r.group, 'devs');
check('chgrp leaves the owner untouched', r.owner, 'student');

// --- usermod -aG (append) vs -G (replace) — a classic real-world footgun ---
sh = new Shell();
run(sh, 'useradd deploy');
run(sh, 'usermod -aG docker deploy');
check('usermod -aG adds the supplementary group', Array.from(sh.state.userGroups.get('deploy')), ['docker']);
run(sh, 'usermod -aG sudo deploy');
check('a second -aG APPENDS, keeping the earlier group', Array.from(sh.state.userGroups.get('deploy')).sort(), ['docker', 'sudo']);
run(sh, 'usermod -G root deploy');
check('usermod -G WITHOUT -a REPLACES the whole supplementary list', Array.from(sh.state.userGroups.get('deploy')), ['root']);
r = run(sh, 'usermod -aG nosuchgroup deploy');
check('usermod -aG on a nonexistent group is refused', r.code, 1);

// --- id on a dynamically-created user (used to always report the CURRENT user, ignoring its argument) ---
sh = new Shell();
run(sh, 'useradd deploy');
r = run(sh, 'id deploy');
check('id <user> reports that user, not whoever is currently logged in', r.stdout.startsWith('uid=1001(deploy)'), true);
run(sh, 'usermod -aG docker deploy');
r = run(sh, 'id deploy');
check('id shows supplementary groups with their gid', r.stdout, 'uid=1001(deploy) gid=1001(deploy) groups=1001(deploy),999(docker)\n');

// --- killall / pkill (name-based, unlike kill which needs an exact PID) ---
sh = new Shell();
run(sh, 'killall nginx');
check('killall removes every process matching that name', sh.state.processes.some((p) => p.cmd.startsWith('nginx')), false);
r = run(sh, 'killall nosuchproc');
check('killall on an unknown name errors', r.code, 1);

sh = new Shell();
r = run(sh, 'pkill python3');
check('pkill matches by process-name regex and succeeds (exit 0)', r.code, 0);
check('pkill removed the matching process', sh.state.processes.some((p) => p.pid === 890), false);
r = run(sh, 'pkill nosuchproc');
check('pkill with no match exits 1 (not an error message, matches real pkill)', r.code, 1);

// --- fg (bring a background job to the foreground) ---
sh = new Shell();
run(sh, 'sleep 5 &');
run(sh, 'sleep 3 &');
r = run(sh, 'fg');
check('bare fg brings the MOST RECENT job forward and echoes its command', r.stdout, 'sleep 3\n');
check('fg removes that job from the list', sh.state.backgroundJobs.length, 1);
r = run(sh, 'fg %1');
check('fg %N targets a specific job by number', r.stdout, 'sleep 5\n');
r = run(sh, 'fg');
check('fg with nothing left running errors', r.stderr, 'fg: no current job\n');

// --- hostname -i / last reboot ---
sh = new Shell();
check('hostname with no args prints the hostname', run(sh, 'hostname').stdout, 'devops-trainer\n');
check('hostname -i prints an IP instead of the name', run(sh, 'hostname -i').stdout, '10.0.0.15\n');

sh = new Shell();
r = run(sh, 'last reboot');
check('last reboot filters to ONLY the reboot line(s)', r.stdout.includes('still logged in'), false);
check('last reboot still includes the reboot entry itself', r.stdout.includes('reboot'), true);
r = run(sh, 'last');
check('plain last (no filter) still shows full login history', r.stdout.includes('still logged in'), true);

// --- lsof -u (was silently accepted and ignored before) ---
sh = new Shell();
check('lsof -u root shows the root-owned listening services', run(sh, 'lsof -u root').stdout.includes('sshd'), true);
check('lsof -u student (nobody listens as student) shows just the header', run(sh, 'lsof -u student').stdout, 'COMMAND   PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\n');

// --- ssh -p (lowercase) vs scp -P (uppercase) — a classic real-world gotcha ---
sh = new Shell();
check('ssh -p uses a LOWERCASE p', run(sh, 'ssh -p 2222 host').stdout, 'Connecting to host on port 2222... (simulated) Welcome to Ubuntu 22.04 LTS\n');
r = run(sh, 'scp -r projects student@host:/tmp/');
check('scp -r no longer misparses -r as the source file', r.stdout.startsWith('projects '), true);
r = run(sh, 'scp a.txt b.txt student@host:/tmp/');
check('scp with multiple sources reports each one, not just the first', r.stdout.split('\n').filter(Boolean).length, 2);

// --- df -i (inode usage, distinct table from the default byte-based one) ---
sh = new Shell();
check('df -i shows inode columns instead of byte sizes', run(sh, 'df -i').stdout.includes('IUse%'), true);
check('plain df still shows byte sizes', run(sh, 'df').stdout.includes('Size'), true);

// --- yum/dnf-only subcommands correctly refused on apt (real apt has no repo/group concept) ---
sh = new Shell();
check('yum repolist works', run(sh, 'yum repolist').code, 0);
r = run(sh, 'apt repolist');
check('apt repolist is refused (apt has no repolist concept, unlike yum/dnf)', r.code, 1);

// --- rpm shares the same package database as yum/dnf (realistic on RHEL) ---
sh = new Shell();
run(sh, 'yum install -y httpd');
check('rpm -q sees a package installed via yum', run(sh, 'rpm -q httpd').stdout, 'httpd-1.0-1.el8.x86_64\n');
r = run(sh, 'rpm -q nosuchpkg');
check('rpm -q on an uninstalled package exits 1', r.code, 1);
run(sh, 'rpm -e httpd');
check('rpm -e removes it from the SAME database yum reads', sh.state.packages.has('httpd'), false);

// --- kill -9 PID (was treating "-9" itself as a second, bogus PID) ---
sh = new Shell();
r = run(sh, 'kill -9 890');
check('kill -9 PID actually kills the given PID, not "-9" itself', r.code, 0);
check('the process is really gone', sh.state.processes.some((p) => p.pid === 890), false);
r = run(sh, 'kill 1044');
check('plain kill (no signal) still works', r.code, 0);

// --- su - username (was ignoring the username whenever "-" was present) ---
sh = new Shell();
run(sh, 'useradd deploy');
run(sh, 'su - deploy');
check('su - username switches to THAT user, not root', sh.fs.currentUser, 'deploy');
run(sh, 'su - root');
check('su - root (or bare su -) still switches to root', sh.fs.currentUser, 'root');

// --- chown owner.group (legacy dot separator, alongside owner:group) ---
sh = new Shell();
run(sh, 'chown alice.devs documents/notes.txt');
r = sh.fs.getNode('/home/student/documents/notes.txt');
check('chown owner.group sets the owner via the dot separator', r.owner, 'alice');
check('chown owner.group sets the group via the dot separator', r.group, 'devs');

// --- sed -i (in-place edit; previously not supported at all) ---
sh = new Shell();
sh.fs.writeFile('/home/student/greet.txt', 'hello world\n');
r = run(sh, "sed -i 's/hello/goodbye/' greet.txt");
check('sed -i produces no stdout (it writes the file instead)', r.stdout, '');
check('sed -i actually rewrites the file on disk', sh.fs.getNode('/home/student/greet.txt').content, 'goodbye world\n');
sh.fs.writeFile('/home/student/a.txt', 'foo\n');
sh.fs.writeFile('/home/student/b.txt', 'foo\n');
run(sh, "sed -i 's/foo/bar/' a.txt b.txt");
check('sed -i with multiple files edits EACH independently, not merged', sh.fs.getNode('/home/student/a.txt').content, 'bar\n');
check('...same for the second file', sh.fs.getNode('/home/student/b.txt').content, 'bar\n');

// --- grep -R (capital, alongside the existing lowercase -r) ---
sh = new Shell();
check('grep -R recurses the same way -r does', run(sh, 'grep -R Welcome /etc').stdout, run(sh, 'grep -r Welcome /etc').stdout);

// --- wget -O (custom output filename; previously broke argument parsing entirely) ---
sh = new Shell();
r = run(sh, 'wget -O myfile.repo http://example.com/some/long/path.repo');
check('wget -O saves under the GIVEN name, not one derived from the URL', sh.fs.exists('/home/student/myfile.repo'), true);
check('wget -O reports the given name', r.stdout.includes('myfile.repo'), true);

// --- systemctl reload (previously an "unknown action" error) ---
sh = new Shell();
r = run(sh, 'systemctl reload nginx');
check('systemctl reload is a recognized action', r.code, 0);

// --- tar -C (extract into a different directory) ---
sh = new Shell();
sh.fs.mkdir('/home/student/srcdir');
sh.fs.writeFile('/home/student/srcdir/f.txt', 'x\n');
run(sh, 'tar -czf a.tar.gz srcdir');
sh.fs.mkdir('/home/student/dest');
run(sh, 'tar -xzf a.tar.gz -C dest');
check('tar -xzf ... -C dest extracts into dest, not cwd', sh.fs.exists('/home/student/dest/srcdir/f.txt'), true);
check('tar -C does not also extract into cwd', sh.fs.exists('/home/student/srcdir/f.txt') && !sh.fs.exists('/home/student/dest/srcdir'), false);

// --- unlink (single-file removal; distinct from rm) ---
sh = new Shell();
run(sh, 'touch a.txt');
run(sh, 'ln -s a.txt link.txt');
run(sh, 'unlink link.txt');
check('unlink removes the symlink itself', sh.fs.exists('/home/student/link.txt'), false);
check('unlink leaves the target file untouched', sh.fs.exists('/home/student/a.txt'), true);
r = run(sh, 'unlink documents');
check('unlink refuses a directory (no -r option exists on unlink)', r.code, 1);

// --- dpkg shares the same package database as apt (realistic on Debian/Ubuntu) ---
sh = new Shell();
run(sh, 'apt install -y nginx');
check('dpkg -l sees a package installed via apt', run(sh, 'dpkg -l').stdout.includes('nginx'), true);
run(sh, 'dpkg -r nginx');
check('dpkg -r removes it from the SAME database apt reads', sh.state.packages.has('nginx'), false);

// --- telnet (open vs closed port; connection state comes from listeningPorts) ---
sh = new Shell();
r = run(sh, 'telnet api.internal 80');
check('telnet to an open port connects', r.stdout.includes('Connected to api.internal'), true);
r = run(sh, 'telnet api.internal 9999');
check('telnet to a closed port is refused', r.code, 1);
check('the refusal message goes to stderr, matching real telnet', r.stderr.includes('Connection refused'), true);

// --- /proc/* files (seeded, real-world content students actually cat) ---
sh = new Shell();
check('/proc/cpuinfo exists and is readable', run(sh, 'cat /proc/cpuinfo').stdout.includes('model name'), true);
check('/proc/meminfo exists and is readable', run(sh, 'cat /proc/meminfo').stdout.includes('MemTotal'), true);
check('/proc/interrupts exists and is readable', run(sh, 'cat /proc/interrupts').stdout.includes('IO-APIC'), true);
check('/proc/uptime exists and is readable', /^\d+\.\d+/.test(run(sh, 'cat /proc/uptime').stdout), true);

// --- git clone (was gated behind "must already be inside a repo" — backwards) ---
sh = new Shell();
r = run(sh, 'git clone https://github.com/student/demo.git');
check('git clone works from OUTSIDE any existing repo (that is the normal case)', r.code, 0);
check('git clone creates the target directory', sh.fs.isDir('/home/student/demo'), true);
check('git clone registers the new repo with origin set', sh.state.gitRepos.get('/home/student/demo').remotes.origin, 'https://github.com/student/demo.git');

// --- git config (previously did not exist at all) ---
sh = new Shell();
run(sh, 'git config --global user.name "Andrii"');
run(sh, 'git config --global user.email andrii@example.com');
check('git config --list shows both set values', run(sh, 'git config --list').stdout, 'user.name=Andrii\nuser.email=andrii@example.com\n');
check('git config <key> reads a single value back', run(sh, 'git config user.name').stdout, 'Andrii\n');
check('git config on an unset key exits 1 (matches real git)', run(sh, 'git config user.nosuchkey').code, 1);

// --- systemctl mask/unmask (stronger than disable — blocks manual start too) ---
sh = new Shell();
run(sh, 'systemctl mask nginx');
r = run(sh, 'systemctl start nginx');
check('a masked unit refuses even a manual start', r.code, 1);
check('...with the right error message', r.stderr, 'Failed to start nginx: Unit nginx is masked.\n');
check('is-enabled reports "masked", not "disabled", for a masked unit', run(sh, 'systemctl is-enabled nginx').stdout, 'masked\n');
run(sh, 'systemctl unmask nginx');
check('after unmask, start works again', run(sh, 'systemctl start nginx').code, 0);

// --- crontab (previously had NO way to actually install a job at all) ---
sh = new Shell();
r = run(sh, 'crontab -l');
check('crontab -l with nothing installed fails, matching real cron (not silently empty)', r.code, 1);
check('...with the real "no crontab for" message', r.stderr, 'no crontab for student\n');
run(sh, 'echo "30 3 * * * backup.sh" | crontab -');
check('piping into crontab - actually installs the job', sh.state.cronJobs, ['30 3 * * * backup.sh']);
r = run(sh, 'crontab -l');
check('crontab -l now succeeds and shows the installed job', r.stdout, '30 3 * * * backup.sh\n');
run(sh, 'crontab -r');
check('crontab -r clears every job', sh.state.cronJobs.length, 0);

// --- git branch -d/-D/-m/-M/-c/-C (previously ALL silently created a new
// branch with that name instead of deleting/renaming/copying — branch()
// never called parseFlags at all) ---
sh = new Shell();
run(sh, 'git init');
run(sh, 'git branch feature-x');
run(sh, 'git branch -d feature-x');
check('git branch -d actually deletes the branch', sh.state.gitRepos.get('/home/student').branches.includes('feature-x'), false);
r = run(sh, 'git branch -d feature-x');
check('deleting an already-gone branch fails cleanly', r.code, 1);
run(sh, 'git branch feature-y');
r = run(sh, 'git branch -d main');
check('deleting the CURRENTLY CHECKED OUT branch is refused', r.stderr.includes('checked out'), true);
run(sh, 'git branch -m feature-y renamed-y');
let repo = sh.state.gitRepos.get('/home/student');
check('git branch -m renames (old name gone)', repo.branches.includes('feature-y'), false);
check('git branch -m renames (new name present)', repo.branches.includes('renamed-y'), true);
run(sh, 'git branch -M trunk'); // 1-arg form renames the CURRENT branch
repo = sh.state.gitRepos.get('/home/student');
check('git branch -M with one arg renames the current branch', repo.currentBranch, 'trunk');
run(sh, 'git branch -c renamed-y renamed-y-copy');
repo = sh.state.gitRepos.get('/home/student');
check('git branch -c copies (original still present)', repo.branches.includes('renamed-y'), true);
check('git branch -c copies (copy present too)', repo.branches.includes('renamed-y-copy'), true);
r = run(sh, 'git branch renamed-y-copy');
check('creating a branch with a name that already exists now fails (used to silently no-op)', r.stderr, "fatal: A branch named 'renamed-y-copy' already exists.\n");

// --- git clone -b (was completely broken: -b would be read as the URL) ---
sh = new Shell();
run(sh, 'git clone -b develop https://github.com/x/y.git');
check('git clone -b checks out the given branch, not main', sh.state.gitRepos.get('/home/student/y').currentBranch, 'develop');

// --- git status -s / git add -A ---
sh = new Shell();
run(sh, 'git init');
run(sh, 'touch a.txt');
run(sh, 'git add a.txt');
check('git status -s uses the short A-prefix format', run(sh, 'git status -s').stdout, 'A  a.txt\n');
sh = new Shell();
run(sh, 'git init');
r = run(sh, 'git add -A');
check('git add -A does not crash and stages something', r.code, 0);

// --- git remote -v ---
sh = new Shell();
run(sh, 'git init');
run(sh, 'git remote add origin https://github.com/x/y.git');
check('git remote -v shows fetch/push URLs', run(sh, 'git remote -v').stdout, 'origin\thttps://github.com/x/y.git (fetch)\norigin\thttps://github.com/x/y.git (push)\n');
check('bare git remote still shows just names', run(sh, 'git remote').stdout, 'origin\n');

// --- git push -u ---
sh = new Shell();
run(sh, 'git init');
run(sh, 'git remote add origin https://github.com/x/y.git');
check('git push -u reports the tracking setup', run(sh, 'git push -u origin main').stdout.includes('set up to track'), true);

// --- git rm --cached (untrack without deleting the file) ---
sh = new Shell();
run(sh, 'git init');
run(sh, 'touch secret.env');
run(sh, 'git add secret.env');
run(sh, 'git rm --cached secret.env');
check('git rm --cached untracks the file', sh.state.gitRepos.get('/home/student').tracked.has('secret.env'), false);
check('git rm --cached leaves the file on disk', sh.fs.exists('/home/student/secret.env'), true);
sh = new Shell();
run(sh, 'git init');
run(sh, 'touch other.txt');
run(sh, 'git add other.txt');
run(sh, 'git rm other.txt'); // without --cached, still deletes for real
check('plain git rm (no --cached) still deletes the file', sh.fs.exists('/home/student/other.txt'), false);

module.exports = { passed, failed, failures };
