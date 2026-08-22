'use strict';

// Compact command reference shown on the welcome screen. `cmds` is a list
// of { label, key } — `key` looks up renderer/data/commandDocs.js when the
// command is clicked. Plain command names are globally unique keys;
// short/ambiguous verbs shared across tools (log, run, get…) use a
// "category:verb" key instead.
function c(label, key) {
  return { label, key: key || label };
}

const CHEATSHEET = [
  { icon: '🧭', title: 'Навігація', cmds: [c('pwd'), c('cd'), c('ls'), c('tree')] },
  { icon: '📁', title: 'Файли', cmds: [c('touch'), c('mkdir'), c('cp'), c('mv'), c('rm'), c('ln')] },
  { icon: '📄', title: 'Перегляд', cmds: [c('cat'), c('head'), c('tail'), c('wc'), c('less')] },
  { icon: '🔐', title: 'Права доступу', cmds: [c('chmod'), c('chown'), c('stat')] },
  { icon: '🔍', title: 'Пошук', cmds: [c('grep'), c('find')] },
  { icon: '⚙️', title: 'Обробка тексту', cmds: [c('sed'), c('awk'), c('sort'), c('cut'), c('tr'), c('xargs')] },
  { icon: '📜', title: 'Скрипти', cmds: [c('export'), c('for'), c('if'), c('$(...)')] },
  { icon: '⚡', title: 'Процеси', cmds: [c('ps'), c('top'), c('kill'), c('jobs'), c('free'), c('df')] },
  { icon: '🛠️', title: 'systemd', cmds: [c('systemctl'), c('journalctl')] },
  { icon: '🌐', title: 'Мережа', cmds: [c('ping'), c('curl'), c('ssh'), c('scp'), c('dig')] },
  { icon: '📦', title: 'Пакети', cmds: [c('apt'), c('yum'), c('dnf')] },
  {
    icon: '🔧',
    title: 'Git',
    cmds: [c('init', 'git:init'), c('add', 'git:add'), c('commit', 'git:commit'), c('branch', 'git:branch'), c('log', 'git:log')],
  },
  {
    icon: '🐳',
    title: 'Docker',
    cmds: [c('run', 'docker:run'), c('ps', 'docker:ps'), c('logs', 'docker:logs'), c('build', 'docker:build'), c('exec', 'docker:exec')],
  },
  {
    icon: '☸️',
    title: 'Kubernetes',
    cmds: [c('get', 'k8s:get'), c('apply', 'k8s:apply'), c('scale', 'k8s:scale'), c('describe', 'k8s:describe')],
  },
  { icon: '🗜️', title: 'Архіви', cmds: [c('tar'), c('gzip'), c('zip')] },
  { icon: '⏰', title: 'Cron', cmds: [c('crontab')] },
];

module.exports = { CHEATSHEET };
