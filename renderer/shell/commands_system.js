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
  let signal = 'TERM';
  let pids = args;
  if (args[0] && args[0].startsWith('-')) {
    signal = args[0].slice(1);
    pids = args.slice(1);
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

function cmd_fg(args, ctx) {
  if (!ctx.state.backgroundJobs.length) return fail('fg: no current job\n');
  let idx = ctx.state.backgroundJobs.length - 1;
  if (args[0]) {
    const n = parseInt(args[0].replace(/^%/, ''), 10);
    if (isNaN(n) || n < 1 || n > ctx.state.backgroundJobs.length) {
      return fail(`fg: %${args[0].replace(/^%/, '')}: no such job\n`);
    }
    idx = n - 1;
  }
  const cmdText = ctx.state.backgroundJobs.splice(idx, 1)[0];
  return ok(cmdText + '\n');
}

function procBaseName(cmd) {
  return cmd.split(' ')[0].split('/').pop().replace(/:$/, '');
}

function cmd_pmap(args, ctx) {
  const { rest } = parseFlags(args, ['x', 'd']);
  const pid = parseInt(rest[0], 10);
  if (!pid) return fail('pmap: no process specified\n');
  const proc = ctx.state.processes.find((p) => p.pid === pid);
  if (!proc) return fail(`pmap: cannot find process ${pid}\n`);
  const totalKb = Math.max(256, Math.round(proc.mem * 80000));
  const name = procBaseName(proc.cmd);
  const segs = [
    { addr: '0000560d3f000000', size: Math.round(totalKb * 0.15), perm: 'r-x--', name },
    { addr: '0000560d3f3c0000', size: Math.round(totalKb * 0.05), perm: 'r----', name },
    { addr: '0000560d3f400000', size: Math.round(totalKb * 0.6), perm: 'rw---', name: '[ anon ]' },
    { addr: '00007ffee0000000', size: Math.round(totalKb * 0.2), perm: 'rw---', name: '[ stack ]' },
  ];
  const lines = segs.map((s) => `${s.addr}  ${String(s.size).padStart(6)}K ${s.perm}  ${s.name}`);
  const total = segs.reduce((a, s) => a + s.size, 0);
  return ok(`${pid}:   ${proc.cmd}\n` + lines.join('\n') + `\ntotal          ${total}K\n`);
}

function cmd_killall(args, ctx) {
  const { rest } = parseFlags(args, ['9', 'v'], ['s', 'signal']);
  const name = rest[0];
  if (!name) return fail('killall: usage: killall [-signal] name\n');
  const matches = ctx.state.processes.filter((p) => procBaseName(p.cmd) === name);
  if (!matches.length) return fail(`killall: ${name}: no process found\n`);
  ctx.state.processes = ctx.state.processes.filter((p) => !matches.includes(p));
  return ok('');
}

function cmd_pkill(args, ctx) {
  const { flags, rest } = parseFlags(args, ['9', 'f'], ['s', 'signal']);
  const pattern = rest[0];
  if (!pattern) return fail('pkill: usage: pkill pattern\n');
  let re;
  try {
    re = new RegExp(pattern);
  } catch (e) {
    return fail(`pkill: invalid pattern\n`);
  }
  const matches = ctx.state.processes.filter((p) => re.test(flags.f ? p.cmd : procBaseName(p.cmd)));
  if (!matches.length) return { stdout: '', stderr: '', code: 1 };
  ctx.state.processes = ctx.state.processes.filter((p) => !matches.includes(p));
  return ok('');
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
  const { flags } = parseFlags(args, ['h', 'i']);
  if (flags.i) {
    const header = 'Filesystem      Inodes  IUsed   IFree IUse% Mounted on';
    const rows = ['/dev/sda1      2621440 312450 2308990   12% /', 'tmpfs           500000     412  499588    1% /dev/shm'];
    return ok([header, ...rows].join('\n') + '\n');
  }
  const header = 'Filesystem      Size  Used Avail Use% Mounted on';
  const rows = flags.h
    ? ['/dev/sda1        40G   14G   24G  37% /', 'tmpfs           3.9G     0  3.9G   0% /dev/shm']
    : ['/dev/sda1     41943040 14680064 25165824  37% /', 'tmpfs          4096000        0  4096000   0% /dev/shm'];
  return ok([header, ...rows].join('\n') + '\n');
}

function cmd_fdisk(args, ctx) {
  const { flags } = parseFlags(args, ['l']);
  if (!flags.l) return fail('fdisk: interactive partitioning is not supported in this sandbox; use -l to list\n');
  return ok(
    'Disk /dev/sda: 40 GiB, 42949672960 bytes, 83886080 sectors\n' +
      'Units: sectors of 1 * 512 = 512 bytes\n\n' +
      'Device     Boot   Start      End  Sectors  Size Type\n' +
      '/dev/sda1  *       2048 83884031 83881984   40G Linux\n'
  );
}

function cmd_mount(args, ctx) {
  if (args.length) return fail('mount: mounting new filesystems is not supported in this sandbox\n');
  return ok(
    '/dev/sda1 on / type ext4 (rw,relatime)\n' +
      'tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev)\n' +
      'tmpfs on /tmp type tmpfs (rw,nosuid,nodev)\n'
  );
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
  const name = args.find((a) => !a.startsWith('-')) || ctx.fs.currentUser;
  if (!ctx.state.users.has(name)) return fail(`id: '${name}': no such user\n`);
  let uid, gid, groupName;
  if (USERS[name]) {
    uid = USERS[name].uid;
    gid = USERS[name].gid;
    groupName = USERS[name].group;
  } else {
    uid = ctx.state.uids.get(name);
    gid = uid;
    groupName = name;
  }
  const supplementary = Array.from(ctx.state.userGroups.get(name) || []);
  const groupGid = (g) => ctx.state.gids.get(g) || 1000;
  const groupsStr = [`${gid}(${groupName})`, ...supplementary.map((g) => `${groupGid(g)}(${g})`)].join(',');
  return ok(`uid=${uid}(${name}) gid=${gid}(${groupName}) groups=${groupsStr}\n`);
}

function cmd_hostname(args, ctx) {
  const { flags } = parseFlags(args, ['i', 'I']);
  if (flags.i || flags.I) return ok('10.0.0.15\n');
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
    const activeStr = svc.masked ? 'inactive (dead)' : svc.active ? 'active (running)' : 'inactive (dead)';
    const loadedStr = svc.masked ? 'masked (/dev/null; masked)' : `loaded (/lib/systemd/system/${name}; ${svc.enabled ? 'enabled' : 'disabled'})`;
    return ok(
      `● ${name} - ${svc.description}\n` +
        `     Loaded: ${loadedStr}\n` +
        `     Active: ${activeStr}\n`
    );
  }
  if (['start', 'stop', 'restart', 'reload', 'reload-or-restart', 'enable', 'disable'].includes(action)) {
    const name = resolveName(svcName);
    const svc = services[name];
    if (!svc) return fail(`Unit ${svcName}.service could not be found.\n`);
    // A masked unit refuses every activation path (start/restart/reload/
    // enable) — that's the whole point of mask vs plain disable, which
    // only blocks autostart-at-boot but still allows a manual start.
    if (svc.masked && action !== 'stop' && action !== 'disable') {
      return fail(`Failed to ${action} ${name}: Unit ${name} is masked.\n`);
    }
    if (action === 'start' || action === 'restart' || action === 'reload' || action === 'reload-or-restart') svc.active = true;
    if (action === 'stop') svc.active = false;
    if (action === 'enable') svc.enabled = true;
    if (action === 'disable') svc.enabled = false;
    return ok('');
  }
  if (action === 'mask' || action === 'unmask') {
    const name = resolveName(svcName);
    const svc = services[name];
    if (!svc) return fail(`Unit ${svcName}.service could not be found.\n`);
    if (action === 'mask') {
      svc.masked = true;
      svc.active = false;
      return ok(`Created symlink /etc/systemd/system/${name} → /dev/null.\n`);
    }
    svc.masked = false;
    return ok(`Removed "/etc/systemd/system/${name}".\n`);
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
    if (svc.masked) return { stdout: 'masked\n', stderr: '', code: 1 };
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
    if (action === 'clean' && pkgs[0] === 'all') return ok('Cleaning repos...\n0 files removed\n');
    if (action === 'info') {
      const p = pkgs[0];
      if (!p) return fail(`${name}: missing package name\n`);
      if (!AVAILABLE_PACKAGES.has(p)) return fail(`${name}: No package ${p} available.\n`);
      const status = ctx.state.packages.has(p) ? 'installed' : 'available';
      return ok(`Name: ${p}\nVersion: 1.0-1\nStatus: ${status}\nDescription: ${p} package\n`);
    }
    const isYumFamily = name === 'yum' || name === 'dnf';
    if (action === 'history' && isYumFamily) {
      return ok(
        'ID     | Command line             | Date\n' +
          '-------------------------------------------\n' +
          '     2 | install git curl         | 2026-08-20\n' +
          '     1 | install coreutils bash   | 2026-08-19\n'
      );
    }
    if (action === 'repolist' && isYumFamily) {
      return ok(
        'repo id                repo name                     status\n' +
          'base                   Base OS repository            enabled\n' +
          'updates                Updates repository            enabled\n'
      );
    }
    if (action === 'grouplist' && isYumFamily) {
      return ok('Available Groups:\n   Development Tools\n   Web Server\n');
    }
    if (action === 'groupinstall' && isYumFamily) {
      const group = pkgs.join(' ');
      if (!group) return fail(`${name}: missing group name\n`);
      return ok(`Installing group '${group}'...\nComplete!\n`);
    }
    return fail(`${name}: unknown command '${action}'\n`);
  };
}

function cmd_rpm(args, ctx) {
  const { flags, rest } = parseFlags(args, ['q', 'a', 'i', 'l', 'e', 'v', 'h']);
  if (flags.q && flags.a) {
    const pkgs = Array.from(ctx.state.packages).sort();
    return ok(pkgs.map((p) => `${p}-1.0-1.el8.x86_64`).join('\n') + (pkgs.length ? '\n' : ''));
  }
  if (flags.e) {
    const pkg = rest[0];
    if (!pkg) return fail('rpm: no package given for erase\n');
    if (!ctx.state.packages.has(pkg)) return fail(`error: package ${pkg} is not installed\n`);
    ctx.state.packages.delete(pkg);
    return ok('');
  }
  if (flags.i && !flags.q) {
    const pkg = rest[0];
    if (!pkg) return fail('rpm: no package given for install\n');
    const name = pkg.replace(/\.rpm$/, '').split('-')[0];
    ctx.state.packages.add(name);
    return ok(
      flags.v && flags.h
        ? `Preparing...                          ################# [100%]\nUpdating / installing...\n   1:${name}-1.0-1                  ################# [100%]\n`
        : ''
    );
  }
  if (flags.q && flags.l) {
    const pkg = rest[0];
    if (!pkg) return fail('rpm: no package given for query\n');
    if (!ctx.state.packages.has(pkg)) return fail(`package ${pkg} is not installed\n`);
    return ok(`/etc/${pkg}.conf\n/usr/bin/${pkg}\n/usr/share/doc/${pkg}/README\n`);
  }
  if (flags.q && flags.i) {
    const pkg = rest[0];
    if (!pkg) return fail('rpm: no package given for query\n');
    if (!ctx.state.packages.has(pkg)) return fail(`package ${pkg} is not installed\n`);
    return ok(
      `Name        : ${pkg}\nVersion     : 1.0\nRelease     : 1.el8\nArchitecture: x86_64\nInstall Date: Sat Aug 22 12:00:00 2026\n`
    );
  }
  if (flags.q) {
    const pkg = rest[0];
    if (!pkg) return fail('rpm: no package given for query\n');
    if (!ctx.state.packages.has(pkg)) return fail(`package ${pkg} is not installed\n`);
    return ok(`${pkg}-1.0-1.el8.x86_64\n`);
  }
  return fail('rpm: unknown option combination\n');
}

function cmd_dpkg(args, ctx) {
  const { flags, rest } = parseFlags(args, ['i', 'l', 'r', 'L', 's', 'P']);
  if (flags.l) {
    const pkgs = Array.from(ctx.state.packages).sort();
    const header =
      'Desired=Unknown/Install/Remove/Purge/Hold\n' +
      '| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n' +
      '|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)\n' +
      '||/ Name           Version      Architecture Description\n' +
      '+++-==============-============-============-=================\n';
    const rows = pkgs.map((p) => `ii  ${p.padEnd(15)}1.0-1        amd64        ${p} package`);
    return ok(header + rows.join('\n') + (rows.length ? '\n' : ''));
  }
  if (flags.i) {
    const file = rest[0];
    if (!file) return fail('dpkg: error: install needs a filename argument\n');
    const name = file.replace(/\.deb$/, '').split(/[_-]/)[0];
    ctx.state.packages.add(name);
    return ok(`Selecting previously unselected package ${name}.\nUnpacking ${name} ...\nSetting up ${name} ...\n`);
  }
  if (flags.r || flags.P) {
    const pkg = rest[0];
    if (!pkg) return fail('dpkg: error: need a package name\n');
    if (!ctx.state.packages.has(pkg)) return fail(`dpkg: warning: ignoring request to remove ${pkg} which isn't installed\n`);
    ctx.state.packages.delete(pkg);
    return ok(`${flags.P ? 'Purging configuration files for' : 'Removing'} ${pkg} ...\n`);
  }
  if (flags.L) {
    const pkg = rest[0];
    if (!pkg) return fail('dpkg: error: need a package name\n');
    if (!ctx.state.packages.has(pkg)) return fail(`dpkg-query: package '${pkg}' is not installed\n`);
    return ok(`/usr/bin/${pkg}\n/etc/${pkg}.conf\n/usr/share/doc/${pkg}/README\n`);
  }
  if (flags.s) {
    const pkg = rest[0];
    if (!pkg) return fail('dpkg: error: need a package name\n');
    if (!ctx.state.packages.has(pkg)) return fail(`dpkg-query: package '${pkg}' is not installed and no information is available\n`);
    return ok(`Package: ${pkg}\nStatus: install ok installed\nVersion: 1.0-1\n`);
  }
  return fail('dpkg: unknown option combination\n');
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
  const { flags, rest } = parseFlags(args, [], ['O']);
  const url = rest[0];
  if (!url) return fail('wget: missing URL\n');
  const name = flags.O || url.split('/').filter(Boolean).pop() || 'index.html';
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

function cmd_telnet(args, ctx) {
  const host = args[0];
  if (!host) return fail('telnet: usage: telnet host [port]\n');
  const port = args[1] ? parseInt(args[1], 10) : 23;
  const ip = ctx.state.network.hosts[host] || '198.51.100.23';
  const listening = ctx.state.network.listeningPorts.some((lp) => parseInt(lp.local.split(':')[1], 10) === port);
  if (listening) {
    return ok(`Trying ${ip}...\nConnected to ${host}.\nEscape character is '^]'.\n`);
  }
  return { stdout: `Trying ${ip}...\n`, stderr: `telnet: connect to address ${ip}: Connection refused\n`, code: 1 };
}

function cmd_ssh(args, ctx) {
  const { flags, rest } = parseFlags(args, [], ['p']);
  const target = rest[rest.length - 1];
  if (!target) return fail('ssh: missing host\n');
  const portNote = flags.p ? ` on port ${flags.p}` : '';
  return ok(`Connecting to ${target}${portNote}... (simulated) Welcome to Ubuntu 22.04 LTS\n`);
}

function cmd_scp(args, ctx) {
  // Note: scp's port flag is capital -P, unlike ssh's lowercase -p — a
  // classic real-world gotcha, modeled deliberately rather than unified.
  const { rest } = parseFlags(args, ['r'], ['P']);
  if (rest.length < 2) return fail('scp: missing operand\n');
  const sources = rest.slice(0, -1);
  const lines = sources.map((s) => `${s}                              100%   1KB   1.0MB/s   00:00`);
  return ok(lines.join('\n') + '\n');
}

function cmd_dig(args, ctx) {
  const host = args.find((a) => !a.startsWith('-'));
  if (!host) return fail('dig: missing host\n');
  const ip = ctx.state.network.hosts[host] || '93.184.216.34';
  return ok(`;; ANSWER SECTION:\n${host}.\t\t300\tIN\tA\t${ip}\n`);
}

function cmd_vmstat(args, ctx) {
  return ok(
    'procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----\n' +
      ' r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st\n' +
      ' 1  0      0 3984512 182340 1843200    0    0     2     5   45   80  3  1 96  0  0\n'
  );
}

function cmd_mpstat(args, ctx) {
  return ok(
    'Linux 5.15.0-devops (devops-trainer)   08/22/2026  _x86_64_ (4 CPU)\n\n' +
      '12:00:00 PM  CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest   %idle\n' +
      '12:00:00 PM  all    3.20    0.00    1.10    0.05    0.00    0.10    0.00    0.00   95.55\n'
  );
}

function cmd_iostat(args, ctx) {
  return ok(
    'Linux 5.15.0-devops (devops-trainer)   08/22/2026  _x86_64_ (4 CPU)\n\n' +
      'avg-cpu:  %user   %nice %system %iowait  %steal   %idle\n' +
      '           3.20    0.00    1.10    0.05    0.00   95.65\n\n' +
      'Device             tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn\n' +
      'sda               4.32        86.40        21.60     345600      86400\n'
  );
}

function cmd_tcpdump(args, ctx) {
  const { flags } = parseFlags(args, [], ['i', 'c']);
  const iface = flags.i || 'eth0';
  return ok(
    'tcpdump: verbose output suppressed, use -v for full protocol decode\n' +
      `listening on ${iface}, link-type EN10MB (Ethernet), capture size 262144 bytes\n` +
      '12:00:01.123456 IP 10.0.0.5.54321 > 10.0.0.15.22: Flags [S], seq 123456789, win 64240\n' +
      '12:00:01.123789 IP 10.0.0.15.22 > 10.0.0.5.54321: Flags [S.], seq 987654321, ack 123456790, win 65160\n' +
      '2 packets captured\n'
  );
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

  if (sub === 'config') {
    // --global/--local both write to the same session-wide store here —
    // a real per-repo vs user-level split isn't modeled, since this
    // sandbox never has more than one "real" identity to configure.
    const { flags, rest: rest2 } = parseFlags(rest, ['global', 'local', 'list', 'l']);
    if (flags.list || flags.l) {
      const entries = Object.entries(ctx.state.gitConfig);
      return ok(entries.map(([k, v]) => `${k}=${v}`).join('\n') + (entries.length ? '\n' : ''));
    }
    const key = rest2[0];
    if (!key) return fail('usage: git config [--global] <key> <value>\n');
    if (rest2.length < 2) {
      const val = ctx.state.gitConfig[key];
      if (val === undefined) return { stdout: '', stderr: '', code: 1 };
      return ok(val + '\n');
    }
    ctx.state.gitConfig[key] = rest2.slice(1).join(' ');
    return ok('');
  }

  if (sub === 'clone') {
    // Like `init`, clone must work OUTSIDE any existing repo — that's the
    // whole point of it (real git refuses to nest a clone target inside
    // one, but never requires the CURRENT directory to already be a repo).
    const { flags, rest: cloneRest } = parseFlags(rest, [], ['b', 'branch', 'depth']);
    const url = cloneRest[0];
    if (!url) return fail('usage: git clone <repository> [<directory>]\n');
    const name = cloneRest[1] || url.split('/').pop().replace(/\.git$/, '');
    const initialBranch = flags.b || flags.branch || 'main';
    ctx.fs.mkdir(ctx.fs.cwd + '/' + name, { parents: true });
    repos.set(ctx.fs.normalize(ctx.fs.cwd + '/' + name), {
      branches: [initialBranch],
      currentBranch: initialBranch,
      staged: new Set(),
      tracked: new Set(),
      commits: [],
      remotes: { origin: url },
      stashes: [],
      tags: {},
    });
    return ok(`Cloning into '${name}'...\ndone.\n`);
  }

  const root = findRepoRoot(ctx);
  if (!root) return fail('fatal: not a git repository (or any of the parent directories): .git\n');
  const repo = repos.get(root);

  if (sub === 'status') {
    const { flags } = parseFlags(rest, ['s', 'short']);
    if (flags.s || flags.short) {
      // Short format: "A  <file>" per staged entry, nothing at all when clean.
      return ok(Array.from(repo.staged).map((f) => `A  ${f}`).join('\n') + (repo.staged.size ? '\n' : ''));
    }
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
    // -A/--all is the common "stage everything" flag; without it, any bare
    // flag argument (e.g. a typo) used to get staged as a literal FILENAME
    // because this never called parseFlags at all.
    const { flags, rest: rest2 } = parseFlags(rest, ['A', 'all']);
    const targets = flags.A || flags.all || !rest2.length ? ['.'] : rest2;
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
    const { flags, rest: rest2 } = parseFlags(rest, ['d', 'D', 'delete', 'm', 'M', 'move', 'c', 'C', 'copy']);
    const del = flags.d || flags.D || flags.delete;
    const move = flags.m || flags.M || flags.move;
    const copy = flags.c || flags.C || flags.copy;
    const force = flags.D || flags.M || flags.C;

    if (del) {
      if (!rest2.length) return fail('fatal: branch name required\n');
      const out = [];
      for (const name of rest2) {
        if (!repo.branches.includes(name)) return fail(`error: branch '${name}' not found.\n`);
        if (name === repo.currentBranch) return fail(`error: Cannot delete branch '${name}' checked out\n`);
        repo.branches = repo.branches.filter((b) => b !== name);
        const lastHash = repo.commits.length ? repo.commits[repo.commits.length - 1].hash : '0000000';
        out.push(`Deleted branch ${name} (was ${lastHash}).`);
      }
      return ok(out.join('\n') + '\n');
    }
    if (move || copy) {
      // One arg renames/copies the CURRENT branch; two args are <old> <new>.
      const [a, b] = rest2;
      const oldName = b ? a : repo.currentBranch;
      const newName = b || a;
      if (!newName) return fail('fatal: branch name required\n');
      if (!repo.branches.includes(oldName)) return fail(`error: refname refs/heads/${oldName} not found\n`);
      if (repo.branches.includes(newName) && !force) return fail(`fatal: A branch named '${newName}' already exists.\n`);
      if (move) {
        // Force-renaming ONTO an existing name replaces it — drop the old
        // target entry first so it doesn't end up duplicated in the list.
        repo.branches = repo.branches.filter((br) => br !== newName);
        repo.branches = repo.branches.map((br) => (br === oldName ? newName : br));
        if (repo.currentBranch === oldName) repo.currentBranch = newName;
        for (const c of repo.commits) if (c.branch === oldName) c.branch = newName;
      } else if (!repo.branches.includes(newName)) {
        repo.branches.push(newName);
      }
      return ok('');
    }
    if (!rest2.length) {
      return ok(repo.branches.map((b) => (b === repo.currentBranch ? '* ' + b : '  ' + b)).join('\n') + '\n');
    }
    const name = rest2[0];
    if (repo.branches.includes(name)) return fail(`fatal: A branch named '${name}' already exists.\n`);
    repo.branches.push(name);
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
    const { flags, rest: rest2 } = parseFlags(rest, ['v', 'verbose']);
    if (rest2[0] === 'add') {
      repo.remotes[rest2[1]] = rest2[2];
      return ok('');
    }
    const names = Object.keys(repo.remotes);
    if (flags.v || flags.verbose) {
      const lines = names.flatMap((n) => [`${n}\t${repo.remotes[n]} (fetch)`, `${n}\t${repo.remotes[n]} (push)`]);
      return ok(lines.join('\n') + (lines.length ? '\n' : ''));
    }
    return ok(names.join('\n') + (names.length ? '\n' : ''));
  }
  if (sub === 'push') {
    const { flags, rest: rest2 } = parseFlags(rest, ['u', 'set-upstream']);
    if (!Object.keys(repo.remotes).length) return fail('fatal: No configured push destination.\n');
    if (flags.u || flags['set-upstream']) {
      const remoteName = rest2[0] || 'origin';
      const branchName = rest2[1] || repo.currentBranch;
      return ok(`Branch '${branchName}' set up to track remote branch '${branchName}' from '${remoteName}'.\nEverything up-to-date\n`);
    }
    return ok(`Everything up-to-date\n`);
  }
  if (sub === 'pull') {
    return ok('Already up to date.\n');
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
    // --cached untracks the file WITHOUT deleting it from disk — the
    // standard fix for "I accidentally committed .env", since it keeps
    // the local file but stops git from tracking it going forward.
    const { flags, rest: rmRest } = parseFlags(rest, ['cached', 'f', 'force']);
    if (!rmRest.length) return fail('fatal: No pathspec was given.\n');
    for (const f of rmRest) {
      if (!flags.cached) {
        try {
          ctx.fs.remove(f, { force: true });
        } catch (e) {
          // ignore — still untrack it below
        }
        repo.staged.add(f);
      }
      repo.tracked.delete(f);
    }
    return ok(rmRest.map((f) => `rm '${f}'`).join('\n') + '\n');
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
  const { flags, rest } = parseFlags(args, ['l', 'r']);
  if (flags.l) {
    if (!ctx.state.cronJobs.length) return fail('no crontab for student\n');
    return ok(ctx.state.cronJobs.join('\n') + '\n');
  }
  if (flags.r) {
    ctx.state.cronJobs = [];
    return ok('');
  }
  // crontab - (reading stdin) installs a NEW crontab, replacing the old one
  // wholesale — the standard non-interactive way to manage cron jobs from
  // a script, since there's no real $EDITOR to open here for -e.
  if (rest[0] === '-') {
    const text = ctx.stdin || '';
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return fail('crontab: empty crontab, nothing installed\n');
    ctx.state.cronJobs = lines;
    return ok('');
  }
  return fail('crontab: interactive editing (-e) is not supported in this sandbox; pipe a new crontab instead: `echo "* * * * * cmd" | crontab -`\n');
}

// ---------------------------------------------------------------------
// Users, privilege, and misc system utilities
// ---------------------------------------------------------------------

function cmd_sudo(args, ctx) {
  if (!args.length) return fail('usage: sudo <command>\n');
  const prevUser = ctx.fs.currentUser;
  ctx.fs.currentUser = 'root';
  try {
    return ctx.run(args.join(' '));
  } finally {
    ctx.fs.currentUser = prevUser;
  }
}

function cmd_su(args, ctx) {
  // "su - name" (login shell) and "su name" both switch to `name`; a bare
  // "su" or "su -" (no name after the dash) switches to root.
  const rest = args.filter((a) => a !== '-');
  const target = rest[0] || 'root';
  if (!ctx.state.users.has(target)) return fail(`su: user ${target} does not exist\n`);
  ctx.fs.currentUser = target;
  return ok('');
}

function cmd_useradd(args, ctx) {
  const name = args.find((a) => !a.startsWith('-'));
  if (!name) return fail('useradd: missing user name\n');
  if (ctx.state.users.has(name)) return fail(`useradd: user '${name}' already exists\n`);
  ctx.state.users.add(name);
  ctx.state.uids.set(name, ctx.state.nextUid++);
  return ok('');
}

function cmd_userdel(args, ctx) {
  const name = args.find((a) => !a.startsWith('-'));
  if (!name) return fail('userdel: missing user name\n');
  if (!ctx.state.users.has(name)) return fail(`userdel: user '${name}' does not exist\n`);
  if (name === 'root' || name === 'student') return fail(`userdel: cannot remove the '${name}' account\n`);
  ctx.state.users.delete(name);
  ctx.state.uids.delete(name);
  ctx.state.userGroups.delete(name);
  return ok('');
}

function cmd_usermod(args, ctx) {
  const { flags, rest } = parseFlags(args, ['a'], ['G']);
  const name = rest[0];
  if (!name) return fail('usermod: missing user name\n');
  if (!ctx.state.users.has(name)) return fail(`usermod: user '${name}' does not exist\n`);
  if (flags.G === undefined) return fail('usermod: no valid modification specified (this sandbox only supports -G/-aG)\n');
  const wanted = flags.G.split(',').filter(Boolean);
  for (const g of wanted) {
    if (!ctx.state.groups.has(g)) return fail(`usermod: group '${g}' does not exist\n`);
  }
  if (!ctx.state.userGroups.has(name)) ctx.state.userGroups.set(name, new Set());
  const current = ctx.state.userGroups.get(name);
  // -G alone REPLACES the whole supplementary-group list (a classic real-world
  // footgun); -aG APPENDS instead, which is why "always use -aG" is the rule.
  if (!flags.a) current.clear();
  for (const g of wanted) current.add(g);
  return ok('');
}

function cmd_passwd(args, ctx) {
  const name = args[0] || ctx.fs.currentUser;
  if (!ctx.state.users.has(name)) return fail(`passwd: user '${name}' does not exist\n`);
  return ok(`passwd: password updated successfully for ${name}\n`);
}

function cmd_uname(args, ctx) {
  const { flags } = parseFlags(args, ['a', 's', 'r', 'n', 'm', 'o']);
  if (flags.a) return ok('Linux devops-trainer 5.15.0-devops #1 SMP x86_64 GNU/Linux\n');
  if (flags.r) return ok('5.15.0-devops\n');
  if (flags.n) return ok('devops-trainer\n');
  if (flags.m || flags.o) return ok('x86_64\n');
  return ok('Linux\n');
}

function cmd_ip(args, ctx) {
  const [sub] = args;
  if (/^(addr|address|a)$/.test(sub)) {
    return ok(
      '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n' +
        '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet 10.0.0.15/24 brd 10.0.0.255 scope global eth0\n'
    );
  }
  if (/^(route|r)$/.test(sub)) {
    return ok('default via 10.0.0.1 dev eth0\n10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.15\n');
  }
  if (!sub) return fail('Usage: ip [ addr | route ] ...\n');
  return fail(`ip: unknown command "${sub}"\n`);
}

function cmd_rsync(args, ctx) {
  const { flags, rest } = parseFlags(args, ['a', 'v', 'z', 'r', 'n']);
  if (rest.length < 2) return fail('rsync: missing source and/or destination operand\n');
  const dest = rest[rest.length - 1];
  const sources = rest.slice(0, -1);
  const names = [];
  for (const src of sources) {
    try {
      ctx.fs.copy(src, dest, { recursive: true });
      names.push(ctx.fs.basename(src));
    } catch (e) {
      return fail(`rsync: ${e.message}\n`);
    }
  }
  if (!flags.v) return ok('');
  return ok(
    `sending incremental file list\n${names.join('\n')}\n\n` +
      'sent 1,024 bytes  received 128 bytes  2,304.00 bytes/sec\ntotal size is 4,096  speedup is 3.55\n'
  );
}

function cmd_locate(args, ctx) {
  const pattern = args[0];
  if (!pattern) return fail('locate: no pattern specified\n');
  const results = [];
  const walk = (node, path) => {
    if (node.name.includes(pattern)) results.push(path);
    if (node.type === 'dir') {
      for (const [name, child] of node.children) {
        walk(child, path === '/' ? '/' + name : path + '/' + name);
      }
    }
  };
  const root = ctx.fs.getNode('/');
  for (const [name, child] of root.children) {
    walk(child, '/' + name);
  }
  if (!results.length) return { stdout: '', stderr: '', code: 1 };
  return ok(results.sort().join('\n') + '\n');
}

function cmd_unalias(args, ctx) {
  const name = args[0];
  if (!name) return fail('unalias: usage: unalias name\n');
  if (!ctx.state.aliases[name]) return fail(`unalias: ${name}: not found\n`);
  delete ctx.state.aliases[name];
  return ok('');
}

function cmd_watch(args, ctx) {
  const { flags, rest } = parseFlags(args, [], ['n']);
  if (!rest.length) return fail('watch: missing command\n');
  const cmdStr = rest.join(' ');
  const result = ctx.run(cmdStr);
  const header = `Every ${flags.n || '2.0'}s: ${cmdStr}    devops-trainer: Sat Aug 22 12:00:00 2026\n\n`;
  return { stdout: header + result.stdout, stderr: result.stderr, code: result.code };
}

function cmd_traceroute(args, ctx) {
  const host = args.find((a) => !a.startsWith('-'));
  if (!host) return fail('traceroute: missing host operand\n');
  const ip = ctx.state.network.hosts[host] || '93.184.216.34';
  return ok(
    `traceroute to ${host} (${ip}), 30 hops max\n` +
      ' 1  10.0.0.1  0.512 ms\n' +
      ' 2  172.16.0.1  1.203 ms\n' +
      ` 3  ${ip}  8.417 ms\n`
  );
}

function cmd_who() {
  return ok('student  pts/0        2026-08-22 12:00 (10.0.0.5)\n');
}

function cmd_last(args, ctx) {
  const lines = [
    'student  pts/0        10.0.0.5         Sat Aug 22 12:00   still logged in',
    'student  pts/0        10.0.0.5         Fri Aug 21 09:15 - 10:42  (01:27)',
    'reboot   system boot  5.15.0-devops    Fri Aug 21 09:00',
  ];
  const filtered = args[0] === 'reboot' ? lines.filter((l) => l.startsWith('reboot')) : lines;
  return ok(filtered.join('\n') + '\n\nwtmp begins Fri Aug 21 09:00:00 2026\n');
}

function cmd_lsof(args, ctx) {
  const { flags } = parseFlags(args, ['i'], ['u']);
  const header = 'COMMAND   PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME';
  let ports = ctx.state.network.listeningPorts;
  if (flags.u !== undefined) ports = ports.filter(() => flags.u === 'root');
  const rows = ports.map(
    (p, i) =>
      `${p.process.padEnd(9)} ${String(100 + i).padStart(3)}  root   6u   IPv4  1234${i}      0t0  TCP ${p.local} (LISTEN)`
  );
  return ok([header, ...rows].join('\n') + '\n');
}

function cmd_w(args, ctx) {
  return ok(
    ' 12:00:00 up 3 days,  2:14,  1 user,  load average: 0.15, 0.22, 0.18\n' +
      'USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT\n' +
      'student  pts/0    10.0.0.5         12:00    0.00s  0.05s  0.01s w\n'
  );
}

function cmd_finger(args, ctx) {
  const name = args[0] || ctx.fs.currentUser;
  if (!ctx.state.users.has(name)) return fail(`finger: ${name}: no such user\n`);
  const fullName = name === 'root' ? 'System Administrator' : 'DevOps Student';
  return ok(
    `Login: ${name.padEnd(20)}Name: ${fullName}\n` +
      `Directory: /home/${name}${' '.repeat(Math.max(1, 20 - `/home/${name}`.length))}Shell: /bin/bash\n` +
      'On since Sat Aug 22 12:00 (UTC) on pts/0 from 10.0.0.5\n' +
      'No mail.\n'
  );
}

function cmd_dmesg(args, ctx) {
  const lines = [
    '[    0.000000] Linux version 5.15.0-devops (build@devops-trainer) #1 SMP',
    '[    0.124532] Command line: BOOT_IMAGE=/boot/vmlinuz-5.15.0-devops root=/dev/sda1',
    '[    1.203411] ACPI: Core revision 20210730',
    '[    2.442017] e1000 0000:00:03.0 eth0: renamed from eth0',
    '[    3.881234] eth0: link up, 1000 Mbps full duplex',
    '[    5.102938] EXT4-fs (sda1): mounted filesystem with ordered data mode',
    '[   12.334521] systemd[1]: Started Network Manager.',
    '[   45.223198] sshd[118]: Server listening on 0.0.0.0 port 22.',
  ];
  return ok(lines.join('\n') + '\n');
}

function cmd_lspci(args, ctx) {
  const lines = [
    '00:00.0 Host bridge: Intel Corporation 440FX - 82441FX PMC [Natoma]',
    '00:01.0 ISA bridge: Intel Corporation 82371SB PIIX3 ISA [Natoma/Triton II]',
    '00:02.0 VGA compatible controller: Red Hat, Inc. Virtio GPU',
    '00:03.0 Ethernet controller: Intel Corporation 82540EM Gigabit Ethernet Controller',
    '00:04.0 SCSI storage controller: Red Hat, Inc. Virtio block device',
  ];
  return ok(lines.join('\n') + '\n');
}

function cmd_lsusb(args, ctx) {
  const lines = [
    'Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub',
    'Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub',
    'Bus 001 Device 002: ID 0627:0001 Adomax Technology Co., Ltd QEMU USB Tablet',
  ];
  return ok(lines.join('\n') + '\n');
}

function cmd_lshal(args, ctx) {
  return ok(
    "udi = '/org/freedesktop/Hal/devices/computer'\n" +
      "  system.kernel.version = '5.15.0-devops'  (string)\n" +
      "  system.hardware.vendor = 'QEMU'  (string)\n" +
      "  system.hardware.product = 'Standard PC'  (string)\n\n" +
      "udi = '/org/freedesktop/Hal/devices/net_eth0'\n" +
      "  net.interface = 'eth0'  (string)\n" +
      "  net.address = '52:54:00:12:34:56'  (string)\n"
  );
}

function cmd_dmidecode(args, ctx) {
  const { flags } = parseFlags(args, [], ['t']);
  if (flags.t === 'system' || flags.t === '1') {
    return ok(
      'Handle 0x0100, DMI type 1, 27 bytes\nSystem Information\n' +
        '\tManufacturer: QEMU\n\tProduct Name: Standard PC (i440FX + PIIX, 1996)\n\tSerial Number: Not Specified\n'
    );
  }
  return ok(
    '# dmidecode 3.3\nGetting SMBIOS data from sysfs.\nSMBIOS 2.8 present.\n8 structures occupying 1234 bytes.\nTable at 0x000F0000.\n'
  );
}

function cmd_hdparm(args, ctx) {
  const { rest } = parseFlags(args, ['I', 'i', 't', 'T']);
  const dev = rest.find((a) => a.startsWith('/dev/'));
  if (!dev) return fail('hdparm: missing device\n');
  return ok(
    `\n${dev}:\n` +
      ' Timing cached reads:   18432 MB in  2.00 seconds = 9221.30 MB/sec\n' +
      ' Timing buffered disk reads: 640 MB in  3.01 seconds = 212.45 MB/sec\n'
  );
}

function cmd_badblocks(args, ctx) {
  const { rest } = parseFlags(args, ['s', 'v', 'n', 'w']);
  const dev = rest.find((a) => a.startsWith('/dev/'));
  if (!dev) return fail('badblocks: missing device\n');
  return ok('Checking for bad blocks (read-only test): done\nPass completed, 0 bad blocks found.\n');
}

function cmd_groupadd(args, ctx) {
  const name = args.find((a) => !a.startsWith('-'));
  if (!name) return fail('groupadd: missing group name\n');
  if (ctx.state.groups.has(name)) return fail(`groupadd: group '${name}' already exists\n`);
  ctx.state.groups.add(name);
  ctx.state.gids.set(name, ctx.state.nextGid++);
  return ok('');
}

function cmd_groupdel(args, ctx) {
  const name = args.find((a) => !a.startsWith('-'));
  if (!name) return fail('groupdel: missing group name\n');
  if (!ctx.state.groups.has(name)) return fail(`groupdel: group '${name}' does not exist\n`);
  if (name === 'root' || name === 'student') return fail(`groupdel: cannot remove the primary group '${name}'\n`);
  ctx.state.groups.delete(name);
  ctx.state.gids.delete(name);
  return ok('');
}

function cmd_updatedb(args, ctx) {
  return ok('');
}

function cmd_cal() {
  return ok(
    '     August 2026\n' +
      'Su Mo Tu We Th Fr Sa\n' +
      '                   1\n' +
      ' 2  3  4  5  6  7  8\n' +
      ' 9 10 11 12 13 14 15\n' +
      '16 17 18 19 20 21 22\n' +
      '23 24 25 26 27 28 29\n' +
      '30 31\n'
  );
}

module.exports = {
  cmd_ps,
  cmd_top,
  cmd_kill,
  cmd_jobs,
  cmd_fg,
  cmd_pmap,
  cmd_killall,
  cmd_pkill,
  cmd_free,
  cmd_df,
  cmd_fdisk,
  cmd_mount,
  cmd_du,
  cmd_vmstat,
  cmd_mpstat,
  cmd_iostat,
  cmd_tcpdump,
  cmd_rpm,
  cmd_dpkg,
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
  cmd_telnet,
  cmd_scp,
  cmd_dig,
  cmd_nslookup,
  cmd_git,
  cmd_docker,
  cmd_docker_compose,
  cmd_crontab,
  cmd_sudo,
  cmd_su,
  cmd_useradd,
  cmd_userdel,
  cmd_usermod,
  cmd_passwd,
  cmd_uname,
  cmd_ip,
  cmd_rsync,
  cmd_locate,
  cmd_unalias,
  cmd_watch,
  cmd_traceroute,
  cmd_cal,
  cmd_who,
  cmd_last,
  cmd_lsof,
  cmd_w,
  cmd_finger,
  cmd_dmesg,
  cmd_lspci,
  cmd_lsusb,
  cmd_lshal,
  cmd_dmidecode,
  cmd_hdparm,
  cmd_badblocks,
  cmd_groupadd,
  cmd_groupdel,
  cmd_updatedb,
};
