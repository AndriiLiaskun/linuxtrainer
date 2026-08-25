'use strict';

// Compact command reference shown on the welcome screen. `cmds` is a list
// of { label, key } — `key` looks up renderer/data/commandDocs.js when the
// command is clicked. Plain command names are globally unique keys;
// short/ambiguous verbs shared across tools (log, run, get…) use a
// "category:verb" key instead.
//
// Coverage is audited by test/cheatsheetCoverage.test.js against the shell's
// actual REGISTRY — every implemented command should appear here (aliases
// like apt-get/egrep/more/gunzip are the deliberate exceptions, folded into
// their canonical command's description instead of getting their own card).
function c(label, key) {
  return { label, key: key || label };
}

const CHEATSHEET = [
  {
    icon: '🔗',
    title: 'Оператори оболонки',
    cmds: [
      c('|', 'op:pipe'),
      c('&&', 'op:and'),
      c('||', 'op:or'),
      c(';', 'op:semi'),
      c('&', 'op:bg'),
      c('>', 'op:redirect-out'),
      c('>>', 'op:redirect-append'),
      c('2>', 'op:redirect-err'),
      c('&>', 'op:redirect-both'),
      c('2>&1', 'op:redirect-dup'),
      c('/dev/null', 'op:devnull'),
    ],
  },
  { icon: '🧭', title: 'Навігація', cmds: [c('pwd'), c('cd'), c('ls'), c('tree'), c('dirname'), c('basename'), c('realpath')] },
  { icon: '📁', title: 'Файли', cmds: [c('touch'), c('mkdir'), c('cp'), c('mv'), c('rm'), c('rmdir'), c('ln'), c('file')] },
  { icon: '📄', title: 'Перегляд', cmds: [c('cat'), c('head'), c('tail'), c('wc'), c('less'), c('diff')] },
  { icon: '🔐', title: 'Права та користувачі', cmds: [c('chmod'), c('chown'), c('chgrp'), c('stat'), c('umask'), c('sudo'), c('su'), c('visudo'), c('passwd'), c('useradd'), c('adduser'), c('userdel'), c('usermod'), c('groupadd'), c('groupdel'), c('who'), c('last')] },
  { icon: '🔍', title: 'Пошук', cmds: [c('grep'), c('find'), c('locate'), c('updatedb')] },
  { icon: '⚙️', title: 'Обробка тексту', cmds: [c('sed'), c('awk'), c('sort'), c('cut'), c('tr'), c('xargs'), c('uniq'), c('tee')] },
  { icon: '📜', title: 'Скрипти', cmds: [c('echo'), c('export'), c('for'), c('if'), c('$(...)'), c('sleep'), c('history'), c('unalias'), c('man'), c('cal')] },
  { icon: '⚡', title: 'Процеси', cmds: [c('ps'), c('top'), c('htop'), c('kill'), c('killall'), c('pkill'), c('pmap'), c('jobs'), c('fg'), c('free'), c('df'), c('fdisk'), c('mount'), c('du'), c('uptime'), c('watch'), c('lsof'), c('w'), c('finger'), c('vmstat'), c('mpstat'), c('iostat')] },
  { icon: '🛠️', title: 'systemd', cmds: [c('systemctl'), c('journalctl')] },
  { icon: '🌐', title: 'Мережа', cmds: [c('ping'), c('curl'), c('wget'), c('ssh'), c('scp'), c('dig'), c('nslookup'), c('ss'), c('netstat'), c('ip'), c('rsync'), c('traceroute'), c('tcpdump')] },
  { icon: '📦', title: 'Пакети', cmds: [c('apt'), c('yum'), c('dnf')] },
  { icon: '🖥️', title: 'Система', cmds: [c('whoami'), c('id'), c('hostname'), c('date'), c('uname')] },
  { icon: '🔩', title: 'Апаратне забезпечення', cmds: [c('dmesg'), c('lspci'), c('lsusb'), c('lshal'), c('dmidecode'), c('hdparm'), c('badblocks')] },
  {
    icon: '🔧',
    title: 'Git',
    cmds: [
      c('init', 'git:init'),
      c('add', 'git:add'),
      c('commit', 'git:commit'),
      c('branch', 'git:branch'),
      c('log', 'git:log'),
      c('stash', 'git:stash'),
      c('tag', 'git:tag'),
      c('reset', 'git:reset'),
      c('fetch', 'git:fetch'),
      c('show', 'git:show'),
      c('rm', 'git:rm'),
    ],
  },
  {
    icon: '🐳',
    title: 'Docker',
    cmds: [
      c('run', 'docker:run'),
      c('ps', 'docker:ps'),
      c('start', 'docker:start'),
      c('stop', 'docker:stop'),
      c('restart', 'docker:restart'),
      c('rm', 'docker:rm'),
      c('rmi', 'docker:rmi'),
      c('logs', 'docker:logs'),
      c('build', 'docker:build'),
      c('exec', 'docker:exec'),
      c('inspect', 'docker:inspect'),
      c('tag', 'docker:tag'),
      c('push', 'docker:push'),
      c('network', 'docker:network'),
      c('volume', 'docker:volume'),
      c('docker-compose'),
    ],
  },
  {
    icon: '☸️',
    title: 'Kubernetes',
    cmds: [
      c('get', 'k8s:get'),
      c('apply', 'k8s:apply'),
      c('scale', 'k8s:scale'),
      c('describe', 'k8s:describe'),
      c('delete', 'k8s:delete'),
      c('label', 'k8s:label'),
      c('port-forward', 'k8s:port-forward'),
      c('rollout', 'k8s:rollout'),
      c('top', 'k8s:top'),
      c('exec', 'k8s:exec'),
    ],
  },
  { icon: '🗜️', title: 'Архіви', cmds: [c('tar'), c('gzip'), c('zip'), c('unzip')] },
  { icon: '⏰', title: 'Cron', cmds: [c('crontab')] },
];

module.exports = { CHEATSHEET };
