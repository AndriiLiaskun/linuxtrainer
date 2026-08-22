'use strict';
const h = require('../helpers');

// Independent drills: every fresh Shell() starts with the same seeded
// filesystem, so these need no setup and can be shown/repeated in any order.

const PATHS = [
  { path: '/home/student/projects', label: 'projects', diff: 1 },
  { path: '/home/student/documents', label: 'documents', diff: 1 },
  { path: '/home/student/.config', label: '.config (прихована)', diff: 2 },
  { path: '/home/student/k8s', label: 'k8s', diff: 1 },
  { path: '/home/student/projects/webapp', label: 'projects/webapp', diff: 2 },
  { path: '/home/student/projects/webapp/src', label: 'projects/webapp/src', diff: 2 },
  { path: '/home/student/projects/webapp/logs', label: 'projects/webapp/logs', diff: 2 },
  { path: '/var/log', label: '/var/log', diff: 1 },
  { path: '/var/www/html', label: '/var/www/html', diff: 2 },
  { path: '/etc', label: '/etc', diff: 1 },
  { path: '/tmp', label: '/tmp', diff: 1 },
  { path: '/usr/bin', label: '/usr/bin', diff: 2 },
  { path: '/opt', label: '/opt', diff: 1 },
];

function build() {
  const drills = PATHS.map((p, i) => ({
    id: `p-nav-cd-${i}`,
    difficulty: p.diff,
    prompt: `Перейди в директорію ${p.label}.`,
    hint: p.path.startsWith('/') ? `Абсолютний шлях: cd ${p.path}` : `cd ${p.path}`,
    solution: `cd ${p.path}`,
    xp: 10 + p.diff * 5,
    check: (ctx) => h.cwdIs(ctx.fs, p.path),
  }));

  // pwd/ls sanity variants (always true from the seeded root, cheap variety)
  drills.push({
    id: 'p-nav-pwd-home',
    difficulty: 1,
    prompt: 'Виведи поточну робочу директорію.',
    hint: 'pwd',
    solution: 'pwd',
    xp: 10,
    check: (ctx) => h.stdoutTrim(ctx.result) === '/home/student',
  });
  drills.push({
    id: 'p-nav-ls-hidden-home',
    difficulty: 2,
    prompt: 'Покажи всі файли домашньої директорії разом із прихованими.',
    hint: 'ls -a',
    solution: 'ls -a',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, '.config'),
  });
  drills.push({
    id: 'p-nav-ls-long-projects',
    difficulty: 2,
    prompt: 'Виведи детальний список (з правами доступу) вмісту директорії projects.',
    hint: 'ls -l projects',
    solution: 'ls -l projects',
    xp: 15,
    check: (ctx) => /^d[rwx-]{9}/m.test(ctx.result.stdout),
  });
  drills.push({
    id: 'p-nav-tree-webapp',
    difficulty: 2,
    prompt: 'Виведи деревовидну структуру директорії projects/webapp.',
    hint: 'tree projects/webapp',
    solution: 'tree projects/webapp',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'src') && h.stdoutIncludes(ctx.result, 'logs'),
  });

  return drills;
}

module.exports = { build };
