// System/DevOps-tooling command simulations: processes, systemd, network,
// package managers, git, docker, cron, env.
'use strict';

const { parseFlags, ok, fail } = require('./commands');
const { AVAILABLE_PACKAGES } = require('./state');

// ---------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------

function cmd_ps(args, ctx) {
  // Support classic BSD-style "ps aux" (no leading dash) as well as "-ef".
  const bsdStyle = args.some((a) => /^(aux|ax|au|a)$/.test(a));
  const { flags } = parseFlags(args, ['a', 'u', 'x', 'e', 'f']);
  const detailed = bsdStyle || flags.u || flags.a || flags.e || flags.f;
  const rows = ctx.state.processes;
  const header = detailed
    ? 'USER       PID %CPU %MEM COMMAND'
    : '  PID TTY          TIME CMD';
  const lines = rows.map((p) =>
    detailed
      ? `${p.user.padEnd(10)} ${String(p.pid).padStart(4)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${p.cmd}`
      : `${String(p.pid).padStart(5)} pts/0    00:00:00 ${p.cmd.split(' ')[0]}`
  );
  return ok([header, ...lines].join('\n') + '\n');
}

function cmd_top(args, ctx) {
  const rows = [...ctx.state.processes].sort((a, b) => b.cpu - a.cpu);
  const header =
    'PID    USER      %CPU  %MEM  COMMAND\n' + '(snapshot — press q in a real terminal to quit)';
  const lines = rows.map((p) => `${String(p.pid).padStart(5)}  ${p.user.padEnd(9)} ${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)} ${p.cmd}`);
  return ok(header + '\n' + lines.join('\n') + '\n');
}

function cmd_kill(args, ctx) {
  const { flags, rest } = parseFlags(args, [], ['9', 'SIGKILL']);
  let pids = rest;
  let signal = 'TERM';
  if (args[0] && args[0].startsWith('-')) {
    signal = args[0].slice(1);
    pids = rest;
  }
  if (!pids.length) return fail('kill: usage: kill [-signal] pid\n');
  for (const p of pids) {
    const pid = parseInt(p, 10);
    const idx = ctx.state.processes.findIndex((proc) => proc.pid === pid);
    if (idx === -1) return fail(`kill: (${pid}) - No such process\n`);
    ctx.state.processes.splice(idx, 1);
  }
  return ok('');
}

function cmd_jobs(args, ctx) {
  if (!ctx.state.backgroundJobs.length) return ok('');
  const out = ctx.state.backgroundJobs.map((j, i) => `[${i + 1}]  Running     ${j} &`).join('\n');
  return ok(out + '\n');
}

function cmd_free(args, ctx) {
  const { flags } = parseFlags(args, ['h', 'm', 'g']);
  const header = '              total        used        free      shared  buff/cache   available';
  const row = flags.h
    ? 'Mem:          7.8Gi       2.1Gi       3.9Gi       0.2Gi       1.8Gi       5.3Gi'
    : 'Mem:        8000000     2100000     3900000      200000     1800000     5300000';
  const swap = flags.h ? 'Swap:         2.0Gi          0B       2.0Gi' : 'Swap:       2000000           0     2000000';
  return ok(header + '\n' + row + '\n' + swap + '\n');
}

function cmd_df(args, ctx) {
  const { flags } = parseFlags(args, ['h']);
  const header = 'Filesystem      Size  Used Avail Use% Mounted on';
  const rows = flags.h
    ? ['/dev/sda1        40G   14G   24G  37% /', 'tmpfs           3.9G     0  3.9G   0% /dev/shm']
    : ['/dev/sda1     41943040 14680064 25165824  37% /', 'tmpfs          4096000        0  4096000   0% /dev/shm'];
  return ok([header, ...rows].join('\n') + '\n');
}

function cmd_du(args, ctx) {
  const { flags, rest } = parseFlags(args, ['h', 's']);
  const path = rest[0] || '.';
  const node = ctx.fs.getNode(path);
  if (!node) return fail(`du: cannot access '${path}': No such file or directory\n`);
  const size = (n) => {
    if (n.type === 'file') return n.content.length;
    let total = 0;
    for (const child of n.children.values()) total += size(child);
    return total;
  };
  const bytes = size(node);
  const human = flags.h ? (bytes > 1024 ? (bytes / 1024).toFixed(1) + 'K' : bytes + 'B') : Math.ceil(bytes / 1024);
  return ok(`${human}\t${path}\n`);
}

function cmd_uptime() {
  return ok(' 12:34:56 up 3 days,  4:12,  1 user,  load average: 0.15, 0.10, 0.05\n');
}

function cmd_whoami(args, ctx) {
  return ok(ctx.fs.currentUser + '\n');
}

function cmd_id(args, ctx) {
  const { USERS } = require('./filesystem');
  const u = USERS[ctx.fs.currentUser];
  return ok(`uid=${u.uid}(${ctx.fs.currentUser}) gid=${u.gid}(${u.group}) groups=${u.gid}(${u.group})\n`);
}

function cmd_hostname(args, ctx) {
  return ok(ctx.state.network.hostname + '\n');
}

function cmd_date() {
  return ok('Sat Aug 22 12:00:00 UTC 2026\n');
}

function cmd_sleep() {
  return ok('');
}

function cmd_history(args, ctx) {
  const out = ctx.state.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n');
  return ok(out + (out ? '\n' : ''));
}

// ---------------------------------------------------------------------
// systemd
// ---------------------------------------------------------------------

function cmd_systemctl(args, ctx) {
  const [action, ...rest] = args;
  const svcName = rest[0];
  const services = ctx.state.services;
  const resolveName = (n) => (n && services[n] ? n : n && services[n + '.service'] ? n + '.service' : n);

  if (!action) return fail('systemctl: missing operand\n');

  if (action === 'status') {
    const name = resolveName(svcName);
    const svc = services[name];
    if (!svc) return fail(`Unit ${svcName}.service could not be found.\n`);
    const activeStr = svc.active ? 'active (running)' : 'inactive (dead)';
    return ok(
      `● ${name} - ${svc.description}\n` +
        `     Loaded: loaded (/lib/systemd/system/${name}; ${svc.enabled ? 'enabled' : 'disabled'})\n` +
        `     Active: ${activeStr}\n`
    );
  }
  if (['start', 'stop', 'restart', 'enable', 'disable'].includes(action)) {
    const name = resolveName(svcName);
    const svc = services[name];
    if (!svc) return fail(`Unit ${svcName}.service could not be found.\n`);
    if (action === 'start' || action === 'restart') svc.active = true;
    if (action === 'stop') svc.active = false;
    if (action === 'enable') svc.enabled = true;
    if (action === 'disable') svc.enabled = false;
    return ok('');
  }
  if (action === 'list-units' || action === 'list-unit-files') {
    const rows = Object.entries(services).map(
      ([name, s]) => `${name.padEnd(20)} loaded ${s.active ? 'active   running' : 'inactive dead   '} ${s.description}`
    );
    return ok(rows.join('\n') + '\n');
  }
  if (action === 'is-active') {
    const svc = services[resolveName(svcName)];
    if (!svc) return fail('unknown\n', 4);
    return { stdout: (svc.active ? 'active' : 'inactive') + '\n', stderr: '', code: svc.active ? 0 : 3 };
  }
  if (action === 'is-enabled') {
    const svc = services[resolveName(svcName)];
    if (!svc) return fail('unknown\n', 4);
    return { stdout: (svc.enabled ? 'enabled' : 'disabled') + '\n', stderr: '', code: svc.enabled ? 0 : 1 };
  }
  if (action === 'daemon-reload') return ok('');
  return fail(`systemctl: unknown action '${action}'\n`);
}

function cmd_journalctl(args, ctx) {
  const { flags, rest } = parseFlags(args, ['f'], ['u']);
  const unit = flags.u;
  const sample = [
    'Aug 22 09:59:58 devops-trainer systemd[1]: Starting services...',
    `Aug 22 10:00:00 devops-trainer ${unit || 'systemd'}[342]: Started successfully.`,
    `Aug 22 10:03:12 devops-trainer ${unit || 'kernel'}: WARN high memory usage`,
  ];
  return ok(sample.join('\n') + '\n');
}

// ---------------------------------------------------------------------
// Package managers
// ---------------------------------------------------------------------

function pkgManager(name) {
  return (args, ctx) => {
    let [action, ...rest] = args;
    if (name === 'apt-get' && action === 'update') action = 'update';
    const { flags, rest: pkgs } = parseFlags(rest, ['y']);
    if (action === 'update') return ok('Reading package lists... Done\nBuilding dependency tree... Done\n');
    if (action === 'upgrade') return ok('Calculating upgrade... Done\n0 upgraded, 0 newly installed, 0 to remove.\n');
    if (action === 'install') {
      if (!pkgs.length) return fail(`${name}: missing package name\n`);
      const outLines = [];
      for (const p of pkgs) {
        if (!AVAILABLE_PACKAGES.has(p)) {
          outLines.push(`E: Unable to locate package ${p}`);
          continue;
        }
        ctx.state.packages.add(p);
        outLines.push(`Setting up ${p} ...`);
      }
      const hasErr = outLines.some((l) => l.startsWith('E:'));
      return { stdout: outLines.filter((l) => !l.startsWith('E:')).join('\n') + '\n', stderr: outLines.filter((l) => l.startsWith('E:')).join('\n'), code: hasErr ? 1 : 0 };
    }
    if (action === 'remove' || action === 'purge') {
      if (!pkgs.length) return fail(`${name}: missing package name\n`);
      for (const p of pkgs) ctx.state.packages.delete(p);
      return ok(`Removing ${pkgs.join(', ')} ...\n`);
    }
    if (action === 'list' && rest[0] === '--installed') {
      return ok(Array.from(ctx.state.packages).sort().map((p) => `${p}/stable now`).join('\n') + '\n');
    }
    if (action === 'search') {
      const term = pkgs[0] || '';
      const found = Array.from(AVAILABLE_PACKAGES).filter((p) => p.includes(term));
      return ok(found.join('\n') + (found.length ? '\n' : ''));
    }
    return fail(`${name}: unknown command '${action}'\n`);
  };
}

// ---------------------------------------------------------------------
// Networking (simulated)
// ---------------------------------------------------------------------

function cmd_ping(args, ctx) {
  const { flags, rest } = parseFlags(args, [], ['c']);
  const host = rest[0];
  if (!host) return fail('ping: usage error\n');
  const count = flags.c ? parseInt(flags.c, 10) : 4;
  const ip = ctx.state.network.hosts[host] || '198.51.100.23';
  const lines = [];
  lines.push(`PING ${host} (${ip}) 56(84) bytes of data.`);
  for (let i = 0; i < count; i++) {
    lines.push(`64 bytes from ${ip}: icmp_seq=${i + 1} ttl=54 time=${(10 + Math.random() * 5).toFixed(1)} ms`);
  }
  lines.push(`\n--- ${host} ping statistics ---`);
  lines.push(`${count} packets transmitted, ${count} received, 0% packet loss, time ${count * 100}ms`);
  return ok(lines.join('\n') + '\n');
}

function cmd_curl(args, ctx) {
  const { flags, rest } = parseFlags(args, ['I', 'i', 's', 'v'], ['X', 'o']);
  const url = rest[rest.length - 1];
  if (!url) return fail('curl: try \'curl --help\' for more information\n');
  const method = flags.X || 'GET';
  const host = url.replace(/^https?:\/\//, '').split('/')[0];
  if (!ctx.state.network.hosts[host] && !host.includes('.')) {
    return fail(`curl: (6) Could not resolve host: ${host}\n`);
  }
  const body = JSON.stringify({ status: 'ok', method, url }, null, 2) + '\n';
  if (flags.I) {
    return ok(`HTTP/1.1 200 OK\nServer: nginx\nContent-Type: application/json\n\n`);
  }
  if (flags.o) {
    ctx.fs.writeFile(flags.o, body);
    return ok('');
  }
  return ok(body);
}

function cmd_wget(args, ctx) {
  const { rest } = parseFlags(args, []);
  const url = rest[0];
  if (!url) return fail('wget: missing URL\n');
  const name = url.split('/').filter(Boolean).pop() || 'index.html';
  ctx.fs.writeFile(name, `<!-- downloaded from ${url} -->\n`);
  return ok(`Saving to: '${name}'\n\n${name}  100%  downloaded\n`);
}

function cmd_ss(args, ctx) {
  const header = 'Netid  State    Local Address:Port   Peer Address:Port';
  const rows = ctx.state.network.listeningPorts.map((p) => `${p.proto.padEnd(6)} LISTEN   ${p.local}   0.0.0.0:*   users:(("${p.process}"))`);
  return ok([header, ...rows].join('\n') + '\n');
}

function cmd_netstat(args, ctx) {
  const header = 'Proto Local Address           Foreign Address         State       PID/Program name';
  const rows = ctx.state.network.listeningPorts.map((p) => `${p.proto}   ${p.local.padEnd(23)} 0.0.0.0:*               LISTEN      -/${p.process}`);
  return ok([header, ...rows].join('\n') + '\n');
}

function cmd_ssh(args, ctx) {
  const target = args[args.length - 1];
  if (!target) return fail('ssh: missing host\n');
  return ok(`Connecting to ${target}... (simulated) Welcome to Ubuntu 22.04 LTS\n`);
}

function cmd_scp(args, ctx) {
  if (args.length < 2) return fail('scp: missing operand\n');
  return ok(`${args[0]}                              100%   1KB   1.0MB/s   00:00\n`);
}

function cmd_dig(args, ctx) {
  const host = args.find((a) => !a.startsWith('-'));
  if (!host) return fail('dig: missing host\n');
  const ip = ctx.state.network.hosts[host] || '93.184.216.34';
  return ok(`;; ANSWER SECTION:\n${host}.\t\t300\tIN\tA\t${ip}\n`);
}

function cmd_nslookup(args, ctx) {
  const host = args[0];
  if (!host) return fail('nslookup: missing host\n');
  const ip = ctx.state.network.hosts[host] || '93.184.216.34';
  return ok(`Server:\t\t127.0.0.53\nAddress:\t127.0.0.53#53\n\nName:\t${host}\nAddress: ${ip}\n`);
}

// ---------------------------------------------------------------------
// Git (simplified, stateful per-directory .git repo)
// ---------------------------------------------------------------------

function findRepoRoot(ctx) {
  let dir = ctx.fs.cwd;
  while (true) {
    if (ctx.state.gitRepos.has(dir)) return dir;
    if (dir === '/') return null;
    dir = ctx.fs.dirname(dir);
  }
}

function cmd_git(args, ctx) {
  const [sub, ...rest] = args;
  if (!sub) return fail('usage: git <command> [<args>]\n');
  const repos = ctx.state.gitRepos;

  if (sub === 'init') {
    repos.set(ctx.fs.cwd, {
      branches: ['main'],
      currentBranch: 'main',
      staged: new Set(),
      tracked: new Set(),
      commits: [],
      remotes: {},
      stashes: [],
      tags: {},
    });
    ctx.fs.mkdir(ctx.fs.cwd + '/.git', { parents: true });
    return ok(`Initialized empty Git repository in ${ctx.fs.cwd}/.git/\n`);
  }

  const root = findRepoRoot(ctx);
  if (!root) return fail('fatal: not a git repository (or any of the parent directories): .git\n');
  const repo = repos.get(root);

  if (sub === 'status') {
    const lines = [`On branch ${repo.currentBranch}`];
    if (repo.staged.size) {
      lines.push('Changes to be committed:');
      for (const f of repo.staged) lines.push(`  new file:   ${f}`);
    } else {
      lines.push('nothing to commit, working tree clean');
    }
    return ok(lines.join('\n') + '\n');
  }
  if (sub === 'add') {
    const targets = rest.length ? rest : ['.'];
    for (const t of targets) {
      repo.staged.add(t);
      repo.tracked.add(t);
    }
    return ok('');
  }
  if (sub === 'commit') {
    const { flags } = parseFlags(rest, [], ['m']);
    if (!flags.m) return fail('error: commit message required, use -m\n');
    if (!repo.staged.size) return fail('nothing to commit, working tree clean\n');
    const hash = Math.random().toString(16).slice(2, 9);
    repo.commits.push({ hash, message: flags.m, branch: repo.currentBranch, files: Array.from(repo.staged) });
    const count = repo.staged.size;
    repo.staged.clear();
    return ok(`[${repo.currentBranch} ${hash}] ${flags.m}\n ${count} file(s) changed\n`);
  }
  if (sub === 'log') {
    const { flags } = parseFlags(rest, ['oneline']);
    if (!repo.commits.length) return ok('');
    const lines = [...repo.commits].reverse().map((c) =>
      flags.oneline ? `${c.hash} ${c.message}` : `commit ${c.hash}\nAuthor: student <student@example.com>\n\n    ${c.message}\n`
    );
    return ok(lines.join(flags.oneline ? '\n' : '\n') + '\n');
  }
  if (sub === 'branch') {
    if (!rest.length) {
      return ok(repo.branches.map((b) => (b === repo.currentBranch ? '* ' + b : '  ' + b)).join('\n') + '\n');
    }
    const name = rest.find((a) => !a.startsWith('-'));
    if (!repo.branches.includes(name)) repo.branches.push(name);
    return ok('');
  }
  if (sub === 'checkout') {
    const { flags, rest: rest2 } = parseFlags(rest, ['b']);
    const name = rest2[0];
    if (flags.b) {
      if (!repo.branches.includes(name)) repo.branches.push(name);
      repo.currentBranch = name;
      return ok(`Switched to a new branch '${name}'\n`);
    }
    if (!repo.branches.includes(name)) return fail(`error: pathspec '${name}' did not match any file(s) known to git\n`);
    repo.currentBranch = name;
    return ok(`Switched to branch '${name}'\n`);
  }
  if (sub === 'switch') {
    const { flags, rest: rest2 } = parseFlags(rest, ['c']);
    const name = rest2[0];
    if (flags.c && !repo.branches.includes(name)) repo.branches.push(name);
    if (!repo.branches.includes(name)) return fail(`fatal: invalid reference: ${name}\n`);
    repo.currentBranch = name;
    return ok(`Switched to branch '${name}'\n`);
  }
  if (sub === 'merge') {
    const name = rest[0];
    if (!repo.branches.includes(name)) return fail(`merge: ${name} - not something we can merge\n`);
    return ok(`Merge made by the 'ort' strategy.\n`);
  }
  if (sub === 'diff') {
    return ok('');
  }
  if (sub === 'remote') {
    if (rest[0] === 'add') {
      repo.remotes[rest[1]] = rest[2];
      return ok('');
    }
    return ok(Object.keys(repo.remotes).join('\n') + (Object.keys(repo.remotes).length ? '\n' : ''));
  }
  if (sub === 'push') {
    if (!Object.keys(repo.remotes).length) return fail('fatal: No configured push destination.\n');
    return ok(`Everything up-to-date\n`);
  }
  if (sub === 'pull') {
    return ok('Already up to date.\n');
  }
  if (sub === 'clone') {
    const url = rest[0];
    const name = rest[1] || url.split('/').pop().replace(/\.git$/, '');
    ctx.fs.mkdir(ctx.fs.cwd + '/' + name, { parents: true });
    repos.set(ctx.fs.normalize(ctx.fs.cwd + '/' + name), {
      branches: ['main'],
      currentBranch: 'main',
      staged: new Set(),
      tracked: new Set(),
      commits: [],
      remotes: { origin: url },
      stashes: [],
      tags: {},
    });
    return ok(`Cloning into '${name}'...\ndone.\n`);
  }
  if (sub === 'stash') {
    const action = rest[0];
    if (!action || action === 'push' || action === 'save') {
      if (!repo.staged.size) return ok('No local changes to save\n');
      repo.stashes.push({ branch: repo.currentBranch, files: Array.from(repo.staged) });
      repo.staged.clear();
      return ok(`Saved working directory and index state WIP on ${repo.currentBranch}: stash@{${repo.stashes.length - 1}}\n`);
    }
    if (action === 'list') {
      if (!repo.stashes.length) return ok('');
      const lines = repo.stashes.map((s, i) => `stash@{${repo.stashes.length - 1 - i}}: WIP on ${s.branch}`).reverse();
      return ok(lines.join('\n') + '\n');
    }
    if (action === 'pop' || action === 'apply') {
      if (!repo.stashes.length) return fail('No stash entries found.\n');
      const s = repo.stashes[repo.stashes.length - 1];
      if (action === 'pop') repo.stashes.pop();
      for (const f of s.files) repo.staged.add(f);
      return ok(`On branch ${repo.currentBranch}\nChanges to be committed:\n${s.files.map((f) => '  new file:   ' + f).join('\n')}\n`);
    }
    return fail(`git stash: unknown subcommand '${action}'\n`);
  }
  if (sub === 'tag') {
    const { flags, rest: rest2 } = parseFlags(rest, [], ['a', 'm']);
    if (!rest2.length && !flags.a) {
      return ok(Object.keys(repo.tags).sort().join('\n') + (Object.keys(repo.tags).length ? '\n' : ''));
    }
    const name = flags.a || rest2[0];
    if (repo.tags[name]) return fail(`fatal: tag '${name}' already exists\n`);
    const lastHash = repo.commits.length ? repo.commits[repo.commits.length - 1].hash : null;
    if (!lastHash) return fail('fatal: Failed to resolve \'HEAD\' as a valid ref.\n');
    repo.tags[name] = { hash: lastHash, message: flags.m || null };
    return ok('');
  }
  if (sub === 'reset') {
    const { flags } = parseFlags(rest, ['soft', 'mixed', 'hard']);
    const wasStaged = Array.from(repo.staged);
    repo.staged.clear();
    if (flags.hard) {
      const last = repo.commits[repo.commits.length - 1];
      return ok(last ? `HEAD is now at ${last.hash} ${last.message}\n` : 'HEAD is now at 0000000\n');
    }
    if (!wasStaged.length) return ok('');
    return ok('Unstaged changes after reset:\n' + wasStaged.map((f) => 'M\t' + f).join('\n') + '\n');
  }
  if (sub === 'fetch') {
    if (!Object.keys(repo.remotes).length) return fail('fatal: No remote repository specified.\n');
    return ok('');
  }
  if (sub === 'show') {
    const target = rest.find((a) => !a.startsWith('-'));
    let commit = repo.commits[repo.commits.length - 1];
    if (target) commit = repo.commits.find((c) => c.hash === target) || (repo.tags[target] ? repo.commits.find((c) => c.hash === repo.tags[target].hash) : null);
    if (!commit) return fail(`fatal: bad revision '${target || 'HEAD'}'\n`);
    return ok(`commit ${commit.hash}\nAuthor: student <student@example.com>\n\n    ${commit.message}\n`);
  }
  if (sub === 'rm') {
    if (!rest.length) return fail('fatal: No pathspec was given.\n');
    for (const f of rest) {
      try {
        ctx.fs.remove(f, { force: true });
      } catch (e) {
        // ignore — still untrack it below
      }
      repo.staged.add(f);
      repo.tracked.delete(f);
    }
    return ok(rest.map((f) => `rm '${f}'`).join('\n') + '\n');
  }
  return fail(`git: '${sub}' is not a git command.\n`);
}

// ---------------------------------------------------------------------
// Docker (simplified)
// ---------------------------------------------------------------------

function cmd_docker(args, ctx) {
  const [sub, ...rest] = args;
  const docker = ctx.state.docker;
  if (!sub) return fail('docker: missing command\n');

  if (sub === 'images') {
    const header = 'REPOSITORY   TAG        IMAGE ID       SIZE';
    const rows = docker.images.map((i) => `${i.repo.padEnd(12)} ${i.tag.padEnd(10)} ${i.id.slice(0, 12)}   ${i.size}`);
    return ok([header, ...rows].join('\n') + '\n');
  }
  if (sub === 'ps') {
    const { flags } = parseFlags(rest, ['a']);
    const rows = docker.containers.filter((c) => flags.a || c.status === 'Up');
    const header = 'CONTAINER ID   IMAGE          STATUS         NAMES';
    const lines = rows.map((c) => `${c.id.padEnd(14)} ${c.image.padEnd(14)} ${c.status.padEnd(14)} ${c.name}`);
    return ok([header, ...lines].join('\n') + '\n');
  }
  if (sub === 'run') {
    const { flags, rest: rest2 } = parseFlags(rest, ['d', 'it'], ['name', 'p']);
    const image = rest2[0];
    if (!image) return fail('docker: "run" requires at least 1 argument\n');
    docker.nextId++;
    const id = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
    const container = { id, image, status: 'Up', name: flags.name || `container_${docker.nextId}` };
    docker.containers.push(container);
    return ok((flags.d ? id + '\n' : `Starting ${image}...\n`));
  }
  if (sub === 'stop') {
    const target = rest[0];
    const c = docker.containers.find((c) => c.id.startsWith(target) || c.name === target);
    if (!c) return fail(`Error: No such container: ${target}\n`);
    c.status = 'Exited';
    return ok(target + '\n');
  }
  if (sub === 'start') {
    const target = rest[0];
    const c = docker.containers.find((c) => c.id.startsWith(target) || c.name === target);
    if (!c) return fail(`Error: No such container: ${target}\n`);
    c.status = 'Up';
    return ok(target + '\n');
  }
  if (sub === 'restart') {
    const target = rest[0];
    const c = docker.containers.find((c) => c.id.startsWith(target) || c.name === target);
    if (!c) return fail(`Error: No such container: ${target}\n`);
    c.status = 'Up';
    return ok(target + '\n');
  }
  if (sub === 'rm') {
    const { flags, rest: rest2 } = parseFlags(rest, ['f']);
    const target = rest2[0];
    const idx = docker.containers.findIndex((c) => c.id.startsWith(target) || c.name === target);
    if (idx === -1) return fail(`Error: No such container: ${target}\n`);
    if (docker.containers[idx].status === 'Up' && !flags.f) {
      return fail(`Error response from daemon: cannot remove a running container. Stop it first or use -f\n`);
    }
    docker.containers.splice(idx, 1);
    return ok(target + '\n');
  }
  if (sub === 'rmi') {
    const { flags, rest: rest2 } = parseFlags(rest, ['f']);
    const target = rest2[0];
    const idx = docker.images.findIndex((im) => `${im.repo}:${im.tag}` === target || im.repo === target || im.id.startsWith(target));
    if (idx === -1) return fail(`Error: No such image: ${target}\n`);
    const img = docker.images[idx];
    const inUse = docker.containers.find((c) => c.image === `${img.repo}:${img.tag}` || c.image === img.repo);
    if (inUse && !flags.f) {
      return fail(`Error response from daemon: conflict: unable to remove repository reference "${target}" (must force) - container ${inUse.id.slice(0, 12)} is using its referenced image\n`);
    }
    docker.images.splice(idx, 1);
    return ok(`Untagged: ${target}\n`);
  }
  if (sub === 'inspect') {
    const target = rest[0];
    const c = docker.containers.find((c) => c.id.startsWith(target) || c.name === target);
    if (!c) return fail(`Error: No such object: ${target}\n`);
    return ok(JSON.stringify([{ Id: c.id, Name: '/' + c.name, Image: c.image, State: { Status: c.status } }], null, 2) + '\n');
  }
  if (sub === 'tag') {
    const [source, target] = rest;
    if (!source || !target) return fail('docker: "tag" requires 2 arguments\n');
    const src = docker.images.find((im) => `${im.repo}:${im.tag}` === source || im.repo === source);
    if (!src) return fail(`Error: No such image: ${source}\n`);
    const [repo, tag] = target.split(':');
    const finalTag = tag || 'latest';
    const existing = docker.images.find((im) => im.repo === repo && im.tag === finalTag);
    if (existing) {
      existing.id = src.id;
      existing.size = src.size;
    } else {
      docker.images.push({ repo, tag: finalTag, id: src.id, size: src.size });
    }
    return ok('');
  }
  if (sub === 'push') {
    const target = rest[0];
    const img = docker.images.find((im) => `${im.repo}:${im.tag}` === target || im.repo === target);
    if (!img) return fail(`An image does not exist locally with the tag: ${target}\n`);
    return ok(`The push refers to repository [${img.repo}]\nlatest: digest: sha256:${img.id} size: 528\n`);
  }
  if (sub === 'network') {
    const action = rest[0];
    if (action === 'create') {
      const name = rest[1];
      if (!name) return fail('docker network create: missing NETWORK name\n');
      if (docker.networks.some((n) => n.name === name)) {
        return fail(`Error response from daemon: network with name ${name} already exists\n`);
      }
      docker.networks.push({ name, driver: 'bridge' });
      return ok(name + '\n');
    }
    if (action === 'ls') {
      const header = 'NETWORK ID     NAME      DRIVER';
      const lines = docker.networks.map((n) => `${Math.random().toString(16).slice(2, 14).padEnd(14)} ${n.name.padEnd(9)} ${n.driver}`);
      return ok([header, ...lines].join('\n') + '\n');
    }
    return fail(`docker network: unknown subcommand '${action}'\n`);
  }
  if (sub === 'volume') {
    const action = rest[0];
    if (action === 'create') {
      const name = rest[1];
      if (!name) return fail('docker volume create: missing VOLUME name\n');
      if (!docker.volumes.some((v) => v.name === name)) {
        docker.volumes.push({ name });
      }
      return ok(name + '\n');
    }
    if (action === 'ls') {
      const header = 'DRIVER    VOLUME NAME';
      const lines = docker.volumes.map((v) => `local     ${v.name}`);
      return ok([header, ...lines].join('\n') + '\n');
    }
    return fail(`docker volume: unknown subcommand '${action}'\n`);
  }
  if (sub === 'exec') {
    return ok('(simulated exec output)\n');
  }
  if (sub === 'logs') {
    const target = rest[rest.length - 1];
    const c = docker.containers.find((c) => c.id.startsWith(target) || c.name === target);
    if (!c) return fail(`Error: No such container: ${target}\n`);
    return ok(`[${c.name}] service started on port 8080\n`);
  }
  if (sub === 'build') {
    const { flags } = parseFlags(rest, [], ['t']);
    const tag = flags.t || 'app:latest';
    const [repo, tagName] = tag.split(':');
    docker.images.push({ repo, tag: tagName || 'latest', id: Math.random().toString(16).slice(2, 14), size: '105MB' });
    return ok(`Successfully built and tagged ${tag}\n`);
  }
  if (sub === 'pull') {
    const image = rest[0];
    const [repo, tag] = image.split(':');
    docker.images.push({ repo, tag: tag || 'latest', id: Math.random().toString(16).slice(2, 14), size: '130MB' });
    return ok(`${image}: Pull complete\n`);
  }
  return fail(`docker: '${sub}' is not a docker command.\n`);
}

function cmd_docker_compose(args, ctx) {
  const [sub] = args;
  if (sub === 'up') return ok('Creating network... done\nStarting services... done\n');
  if (sub === 'down') return ok('Stopping services... done\nRemoving network... done\n');
  if (sub === 'ps') return cmd_docker(['ps'], ctx);
  return fail(`docker-compose: unknown command '${sub}'\n`);
}

// ---------------------------------------------------------------------
// Cron
// ---------------------------------------------------------------------

function cmd_crontab(args, ctx) {
  const { flags } = parseFlags(args, ['l', 'r']);
  if (flags.l) {
    return ok(ctx.state.cronJobs.join('\n') + (ctx.state.cronJobs.length ? '\n' : ''));
  }
  if (flags.r) {
    ctx.state.cronJobs = [];
    return ok('');
  }
  return fail('crontab: interactive editing is not supported in this sandbox; use --add via the drill checker\n');
}

module.exports = {
  cmd_ps,
  cmd_top,
  cmd_kill,
  cmd_jobs,
  cmd_free,
  cmd_df,
  cmd_du,
  cmd_uptime,
  cmd_whoami,
  cmd_id,
  cmd_hostname,
  cmd_date,
  cmd_sleep,
  cmd_history,
  cmd_systemctl,
  cmd_journalctl,
  pkgManager,
  cmd_ping,
  cmd_curl,
  cmd_wget,
  cmd_ss,
  cmd_netstat,
  cmd_ssh,
  cmd_scp,
  cmd_dig,
  cmd_nslookup,
  cmd_git,
  cmd_docker,
  cmd_docker_compose,
  cmd_crontab,
};
