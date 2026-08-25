// Orchestrates filesystem + session state + parser + command registry into
// a runnable pseudo-bash shell used by the drills.
'use strict';

const { FileSystem, ShellError } = require('./filesystem');
const { SessionState } = require('./state');
const parser = require('./parser');
const base = require('./commands');
const sys = require('./commands_system');
const archive = require('./commands_archive');
const k8s = require('./commands_k8s');

const REGISTRY = {
  pwd: base.cmd_pwd,
  dirname: base.cmd_dirname,
  basename: base.cmd_basename,
  realpath: base.cmd_realpath,
  cd: base.cmd_cd,
  ls: base.cmd_ls,
  tree: base.cmd_tree,
  touch: base.cmd_touch,
  mkdir: base.cmd_mkdir,
  rm: base.cmd_rm,
  rmdir: base.cmd_rmdir,
  cp: base.cmd_cp,
  mv: base.cmd_mv,
  ln: base.cmd_ln,
  cat: base.cmd_cat,
  less: base.cmd_less,
  more: base.cmd_less,
  vim: base.cmd_vim,
  vi: base.cmd_vim,
  tee: base.cmd_tee,
  man: base.cmd_man,
  echo: base.cmd_echo,
  head: base.cmd_head,
  tail: base.cmd_tail,
  wc: base.cmd_wc,
  file: base.cmd_file,
  stat: base.cmd_stat,
  chmod: base.cmd_chmod,
  chown: base.cmd_chown,
  chgrp: base.cmd_chgrp,
  umask: base.cmd_umask,
  grep: base.cmd_grep,
  egrep: base.cmd_grep,
  find: base.cmd_find,
  sed: base.cmd_sed,
  awk: base.cmd_awk,
  sort: base.cmd_sort,
  uniq: base.cmd_uniq,
  cut: base.cmd_cut,
  tr: base.cmd_tr,
  xargs: base.cmd_xargs,
  diff: base.cmd_diff,

  ps: sys.cmd_ps,
  top: sys.cmd_top,
  htop: sys.cmd_top,
  kill: sys.cmd_kill,
  killall: sys.cmd_killall,
  pkill: sys.cmd_pkill,
  pmap: sys.cmd_pmap,
  jobs: sys.cmd_jobs,
  fg: sys.cmd_fg,
  free: sys.cmd_free,
  df: sys.cmd_df,
  fdisk: sys.cmd_fdisk,
  mount: sys.cmd_mount,
  du: sys.cmd_du,
  vmstat: sys.cmd_vmstat,
  mpstat: sys.cmd_mpstat,
  iostat: sys.cmd_iostat,
  tcpdump: sys.cmd_tcpdump,
  uptime: sys.cmd_uptime,
  whoami: sys.cmd_whoami,
  id: sys.cmd_id,
  hostname: sys.cmd_hostname,
  date: sys.cmd_date,
  sleep: sys.cmd_sleep,
  history: sys.cmd_history,
  systemctl: sys.cmd_systemctl,
  journalctl: sys.cmd_journalctl,
  apt: sys.pkgManager('apt'),
  'apt-get': sys.pkgManager('apt-get'),
  yum: sys.pkgManager('yum'),
  dnf: sys.pkgManager('dnf'),
  rpm: sys.cmd_rpm,
  ping: sys.cmd_ping,
  curl: sys.cmd_curl,
  wget: sys.cmd_wget,
  ss: sys.cmd_ss,
  netstat: sys.cmd_netstat,
  ssh: sys.cmd_ssh,
  scp: sys.cmd_scp,
  dig: sys.cmd_dig,
  nslookup: sys.cmd_nslookup,
  git: sys.cmd_git,
  docker: sys.cmd_docker,
  'docker-compose': sys.cmd_docker_compose,
  crontab: sys.cmd_crontab,
  kubectl: k8s.cmd_kubectl,
  sudo: sys.cmd_sudo,
  su: sys.cmd_su,
  useradd: sys.cmd_useradd,
  adduser: sys.cmd_useradd,
  userdel: sys.cmd_userdel,
  usermod: sys.cmd_usermod,
  passwd: sys.cmd_passwd,
  visudo: (args, ctx) => base.cmd_vim(['/etc/sudoers'], ctx),
  uname: sys.cmd_uname,
  ip: sys.cmd_ip,
  rsync: sys.cmd_rsync,
  locate: sys.cmd_locate,
  unalias: sys.cmd_unalias,
  watch: sys.cmd_watch,
  traceroute: sys.cmd_traceroute,
  cal: sys.cmd_cal,
  who: sys.cmd_who,
  last: sys.cmd_last,
  lsof: sys.cmd_lsof,
  w: sys.cmd_w,
  finger: sys.cmd_finger,
  dmesg: sys.cmd_dmesg,
  lspci: sys.cmd_lspci,
  lsusb: sys.cmd_lsusb,
  lshal: sys.cmd_lshal,
  dmidecode: sys.cmd_dmidecode,
  hdparm: sys.cmd_hdparm,
  badblocks: sys.cmd_badblocks,
  groupadd: sys.cmd_groupadd,
  groupdel: sys.cmd_groupdel,
  updatedb: sys.cmd_updatedb,

  tar: archive.cmd_tar,
  gzip: archive.cmd_gzip,
  gunzip: (args, ctx) => archive.cmd_gzip(['-d', ...args], ctx),
  zip: archive.cmd_zip,
  unzip: archive.cmd_unzip,
};

class Shell {
  constructor() {
    this.fs = new FileSystem();
    this.state = new SessionState();
  }

  clone() {
    // Not a deep clone of FS (drills each get a fresh Shell instance instead).
    return this;
  }

  run(lineRaw, { record = true } = {}) {
    const line = (lineRaw || '').trim();
    if (!line) return { stdout: '', stderr: '', code: 0 };
    if (record) this.state.history.push(line);

    try {
      const loopResult = this._tryForLoop(line);
      if (loopResult) return loopResult;
      const ifResult = this._tryIf(line);
      if (ifResult) return ifResult;

      const tokens = parser.tokenize(line);
      const result = this._runSequence(tokens);
      this.state.lastExitCode = result.code;
      return result;
    } catch (e) {
      if (e instanceof ShellError) {
        return { stdout: '', stderr: e.message + '\n', code: 1 };
      }
      return { stdout: '', stderr: 'error: ' + (e.message || String(e)) + '\n', code: 1 };
    }
  }

  // Runs a command string purely for its stdout (used by $(...) substitution).
  _runInline(cmdStr) {
    const r = this.run(cmdStr, { record: false });
    return r.stdout.replace(/\n+$/, '');
  }

  _expandToken(tok) {
    if (tok.noExpand) return [tok.v];
    const expanded = parser.expandVariables(tok.v, this.fs.env, (s) => this._runInline(s));
    if (tok.quoted) return [expanded];
    return parser.globExpand(expanded, this.fs);
  }

  _expandWords(tokens) {
    const out = [];
    for (const t of tokens) out.push(...this._expandToken(t));
    return out;
  }

  _runSequence(tokens) {
    const segments = parser.splitSequence(tokens);
    let stdout = '';
    let stderr = '';
    let code = 0;
    let prevSep = null;
    for (const seg of segments) {
      if (seg.tokens.length === 0) {
        prevSep = seg.sep;
        continue;
      }
      const shouldRun =
        prevSep === null || prevSep === ';' || prevSep === '&' || (prevSep === '&&' && code === 0) || (prevSep === '||' && code !== 0);
      if (shouldRun) {
        const r = this._runPipeline(seg.tokens);
        if (seg.sep === '&') {
          // Background dispatch: our engine has no real concurrency (every
          // command already completes synchronously), so we run it right
          // away but announce it as a job like real bash does, and don't
          // let its exit code override $? for the rest of the sequence —
          // that's what makes "cmd &" distinct from just running "cmd".
          this.state.jobCounter = (this.state.jobCounter || 0) + 1;
          const jobId = this.state.jobCounter;
          const pid = 1000 + jobId;
          const cmdText = seg.tokens.map((t) => t.v).join(' ');
          this.state.backgroundJobs.push(cmdText);
          stdout += `[${jobId}] ${pid}\n` + r.stdout;
          stderr += r.stderr;
        } else {
          stdout += r.stdout;
          stderr += r.stderr;
          code = r.code;
          this.fs.env.__exitCode = code;
        }
      }
      prevSep = seg.sep;
    }
    return { stdout, stderr, code };
  }

  _runPipeline(tokens) {
    // variable assignment: NAME=value with nothing else
    if (tokens.length === 1 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0].v) && !tokens[0].noExpand) {
      const eq = tokens[0].v.indexOf('=');
      const name = tokens[0].v.slice(0, eq);
      const rawVal = tokens[0].v.slice(eq + 1);
      const value = parser.expandVariables(rawVal, this.fs.env, (s) => this._runInline(s));
      this.fs.env[name] = value;
      return { stdout: '', stderr: '', code: 0 };
    }

    const stages = parser.splitPipes(tokens);
    let stdin = null;
    let finalStdout = '';
    let finalStderr = '';
    let finalCode = 0;

    for (let i = 0; i < stages.length; i++) {
      const {
        args: rawArgs,
        stdoutFile,
        stdoutAppend,
        stderrFile,
        stderrAppend,
        combinedFile,
        combinedAppend,
        stdinFile,
        mergeStderrToStdout,
        mergeStdoutToStderr,
      } = parser.extractRedirects(stages[i]);
      const words = this._expandWords(rawArgs);
      if (words.length === 0) continue;
      const [cmdName, ...args] = words;

      let stageStdin = stdin;
      if (stdinFile) {
        const node = this.fs.getNode(stdinFile);
        if (!node) {
          finalStderr = `${cmdName}: ${stdinFile}: No such file or directory\n`;
          finalCode = 1;
          break;
        }
        stageStdin = node.content;
      }

      const result = this._exec(cmdName, args, stageStdin);
      finalCode = result.code;

      // "2>&1" / "1>&2": merge one stream into the other before any file
      // redirect below writes it out (matches the extremely common
      // `cmd > file 2>&1` pattern — see extractRedirects for the caveat on
      // reversed ordering, which this training shell doesn't model).
      if (mergeStderrToStdout) {
        result.stdout = result.stdout + result.stderr;
        result.stderr = '';
      } else if (mergeStdoutToStderr) {
        result.stderr = result.stderr + result.stdout;
        result.stdout = '';
      }

      const isLast = i === stages.length - 1;
      if (isLast) {
        if (combinedFile) {
          this.fs.writeFile(combinedFile, result.stdout + result.stderr, { append: combinedAppend });
          finalStdout = '';
          finalStderr = '';
        } else {
          if (stdoutFile) {
            this.fs.writeFile(stdoutFile, result.stdout, { append: stdoutAppend });
            finalStdout = '';
          } else {
            finalStdout = result.stdout;
          }
          if (stderrFile) {
            this.fs.writeFile(stderrFile, result.stderr, { append: stderrAppend });
            finalStderr = '';
          } else {
            finalStderr = result.stderr;
          }
        }
      } else {
        stdin = result.stdout;
        if (result.stderr) finalStderr += result.stderr;
      }
    }
    return { stdout: finalStdout, stderr: finalStderr, code: finalCode };
  }

  _exec(cmdName, args, stdin) {
    if (cmdName === 'export') {
      for (const a of args) {
        const eq = a.indexOf('=');
        if (eq === -1) continue;
        this.fs.env[a.slice(0, eq)] = a.slice(eq + 1);
      }
      return { stdout: '', stderr: '', code: 0 };
    }
    if (cmdName === 'env') {
      const out = Object.entries(this.fs.env).map(([k, v]) => `${k}=${v}`).join('\n');
      return { stdout: out + '\n', stderr: '', code: 0 };
    }
    if (cmdName === 'alias') {
      if (!args.length) {
        const out = Object.entries(this.state.aliases).map(([k, v]) => `alias ${k}='${v}'`).join('\n');
        return { stdout: out + (out ? '\n' : ''), stderr: '', code: 0 };
      }
      const eq = args[0].indexOf('=');
      if (eq !== -1) this.state.aliases[args[0].slice(0, eq)] = args[0].slice(eq + 1).replace(/^['"]|['"]$/g, '');
      return { stdout: '', stderr: '', code: 0 };
    }
    if (cmdName === 'which') {
      const target = args[0];
      if (REGISTRY[target]) return { stdout: `/usr/bin/${target}\n`, stderr: '', code: 0 };
      return { stdout: '', stderr: '', code: 1 };
    }
    if (cmdName === 'clear') {
      return { stdout: '\x1bCLEAR\x1b', stderr: '', code: 0 };
    }
    if (cmdName === 'test' || cmdName === '[') {
      const a = cmdName === '[' ? args.slice(0, -1) : args;
      return { stdout: '', stderr: '', code: evalTest(a, this.fs) ? 0 : 1 };
    }
    if (cmdName === 'printf') {
      const fmt = args[0] || '';
      const rest = args.slice(1);
      let idx = 0;
      const out = fmt.replace(/%s|%d|\\n/g, (m) => {
        if (m === '\\n') return '\n';
        return rest[idx++] ?? '';
      });
      return { stdout: out, stderr: '', code: 0 };
    }

    if (this.state.aliases[cmdName]) {
      const expanded = this.state.aliases[cmdName] + ' ' + args.join(' ');
      const t = parser.tokenize(expanded);
      return this._runPipeline(t);
    }

    const fn = REGISTRY[cmdName];
    if (!fn) {
      return { stdout: '', stderr: `bash: ${cmdName}: command not found\n`, code: 127 };
    }
    const ctx = {
      fs: this.fs,
      state: this.state,
      stdin,
      env: this.fs.env,
      run: (s) => this.run(s, { record: false }),
    };
    try {
      return fn(args, ctx);
    } catch (e) {
      if (e instanceof ShellError) return { stdout: '', stderr: e.message + '\n', code: 1 };
      return { stdout: '', stderr: 'error: ' + (e.message || String(e)) + '\n', code: 1 };
    }
  }

  // ---- minimal control flow: single-line for-loops and if/test ----

  _tryForLoop(line) {
    const m = line.match(/^for\s+(\w+)\s+in\s+(.+?);\s*do\s+(.+?);\s*done\s*$/s);
    if (!m) return null;
    const [, varName, listExpr, body] = m;
    const listWords = this._expandWords(parser.tokenize(listExpr));
    let stdout = '';
    let stderr = '';
    let code = 0;
    for (const item of listWords) {
      this.fs.env[varName] = item;
      const r = this._runSequence(parser.tokenize(body));
      stdout += r.stdout;
      stderr += r.stderr;
      code = r.code;
    }
    return { stdout, stderr, code };
  }

  _tryIf(line) {
    const m = line.match(/^if\s+\[\s+(.+?)\s+\];\s*then\s+(.+?)(?:;\s*else\s+(.+?))?;\s*fi\s*$/s);
    if (!m) return null;
    const [, cond, thenBody, elseBody] = m;
    const condWords = this._expandWords(parser.tokenize(cond));
    const passed = evalTest(condWords, this.fs);
    const branch = passed ? thenBody : elseBody;
    if (!branch) return { stdout: '', stderr: '', code: 0 };
    return this._runSequence(parser.tokenize(branch));
  }
}

function evalTest(args, fs) {
  if (args.length === 2) {
    const [op, val] = args;
    const path = fs.normalize(val);
    const node = fs.getNode(path);
    if (op === '-f') return !!node && node.type === 'file';
    if (op === '-d') return !!node && node.type === 'dir';
    if (op === '-e') return !!node;
    if (op === '-z') return val.length === 0;
    if (op === '-n') return val.length > 0;
  }
  if (args.length === 3) {
    const [a, op, b] = args;
    if (op === '=' || op === '==') return a === b;
    if (op === '!=') return a !== b;
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (op === '-eq') return na === nb;
    if (op === '-ne') return na !== nb;
    if (op === '-lt') return na < nb;
    if (op === '-le') return na <= nb;
    if (op === '-gt') return na > nb;
    if (op === '-ge') return na >= nb;
  }
  return false;
}

module.exports = { Shell, REGISTRY };
