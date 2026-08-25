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
    id: 'p-nav-ls-F-projects',
    difficulty: 2,
    prompt: 'Виведи вміст projects із позначками типу файлу (/ для директорій, * для виконуваних, @ для symlink) — прапорець -F.',
    hint: 'ls -F projects',
    solution: 'ls -F projects',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'webapp/'),
  });
  drills.push({
    id: 'p-nav-ls-i-documents',
    difficulty: 2,
    prompt: 'Виведи вміст documents разом з inode-номером кожного файлу (прапорець -i).',
    hint: 'ls -i documents',
    solution: 'ls -i documents',
    xp: 15,
    check: (ctx) => /^\d+ /m.test(ctx.result.stdout),
  });
  drills.push({
    id: 'p-nav-ls-g-projects',
    difficulty: 2,
    prompt: 'Виведи детальний список projects, але БЕЗ стовпця власника (прапорець -g).',
    hint: 'ls -g projects',
    solution: 'ls -g projects',
    xp: 15,
    check: (ctx) => /^d[rwx-]{9} 1 student\s/m.test(ctx.result.stdout),
  });
  drills.push({
    id: 'p-nav-ls-m-home',
    difficulty: 2,
    prompt: 'Виведи вміст домашньої директорії одним рядком через кому (прапорець -m).',
    hint: 'ls -m',
    solution: 'ls -m',
    xp: 15,
    check: (ctx) => h.stdoutTrim(ctx.result).includes(', ') && h.stdoutLines(ctx.result).length === 1,
  });
  drills.push({
    id: 'p-nav-ls-r-home',
    difficulty: 2,
    prompt: 'Виведи вміст домашньої директорії у зворотньому алфавітному порядку (прапорець -r).',
    hint: 'ls -r',
    solution: 'ls -r',
    xp: 15,
    check: (ctx) => {
      const first = h.stdoutTrim(ctx.result).split(/\s+/)[0];
      return first === 'projects';
    },
  });
  drills.push({
    id: 'p-nav-ls-t-newest',
    difficulty: 3,
    prompt: 'Створи файли old.txt і new.txt (у цьому порядку), а потім виведи вміст домашньої директорії, відсортований за часом створення — найновіший файл першим (прапорець -t).',
    hint: 'touch old.txt && touch new.txt && ls -t',
    solution: 'touch old.txt && touch new.txt && ls -t',
    xp: 25,
    check: (ctx) => h.stdoutTrim(ctx.result).split(/\s+/)[0] === 'new.txt',
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

  // ls -l on every seeded directory — cheap, real variety.
  PATHS.forEach((p, i) => {
    drills.push({
      id: `p-nav-lsl-${i}`,
      difficulty: 1,
      prompt: `Виведи детальний список (права доступу, власник, розмір) вмісту директорії ${p.label}.`,
      hint: `ls -l ${p.path}`,
      solution: `ls -l ${p.path}`,
      xp: 15,
      check: (ctx) => (ctx.result.stdout || '').startsWith('total '),
    });
  });

  // Multi-hop relative navigation: reach a nested target via two cd's, verify final cwd.
  const HOPS = [
    { first: 'projects', second: 'webapp', target: '/home/student/projects/webapp' },
    { first: 'projects/webapp', second: 'src', target: '/home/student/projects/webapp/src' },
    { first: 'projects/webapp', second: 'logs', target: '/home/student/projects/webapp/logs' },
    { first: 'projects/webapp/src', second: '..', target: '/home/student/projects/webapp' },
    { first: 'projects/webapp/src', second: '../..', target: '/home/student/projects' },
    { first: 'documents', second: '..', target: '/home/student' },
  ];
  HOPS.forEach((h2, i) => {
    drills.push({
      id: `p-nav-hop-${i}`,
      difficulty: 2,
      prompt: `Перейди спочатку в ${h2.first}, а звідти відносним шляхом у ${h2.second}, і виведи pwd.`,
      hint: `cd ${h2.first} && cd ${h2.second} && pwd`,
      solution: `cd ${h2.first} && cd ${h2.second} && pwd`,
      xp: 20,
      check: (ctx) => h.stdoutTrim(ctx.result) === h2.target,
    });
  });

  // dirname / basename — real utilities, not just cd.
  const DIRNAME_TARGETS = [
    { path: 'documents/notes.txt', dir: '/home/student/documents' },
    { path: 'projects/webapp/src/app.py', dir: '/home/student/projects/webapp/src' },
    { path: 'projects/webapp/deploy.sh', dir: '/home/student/projects/webapp' },
    { path: 'k8s/api-deployment.yaml', dir: '/home/student/k8s' },
  ];
  DIRNAME_TARGETS.forEach((t, i) => {
    drills.push({
      id: `p-nav-dirname-${i}`,
      difficulty: 2,
      prompt: `Виведи директорію, що містить файл ${t.path}, командою dirname.`,
      hint: `dirname ${t.path}`,
      solution: `dirname ${t.path}`,
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result) === t.dir,
    });
    drills.push({
      id: `p-nav-basename-${i}`,
      difficulty: 1,
      prompt: `Виведи лише назву файлу (без шляху) для ${t.path} командою basename.`,
      hint: `basename ${t.path}`,
      solution: `basename ${t.path}`,
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result) === t.path.split('/').pop(),
    });
    drills.push({
      id: `p-nav-cdsub-${i}`,
      difficulty: 3,
      prompt: `Використай підстановку команди, щоб перейти в директорію файлу ${t.path} (без ручного набору шляху) і виведи pwd.`,
      hint: `cd $(dirname ${t.path}) && pwd`,
      solution: `cd $(dirname ${t.path}) && pwd`,
      xp: 30,
      check: (ctx) => h.stdoutTrim(ctx.result) === t.dir,
    });
  });

  // tree on more directories.
  ['documents', 'k8s', '/etc'].forEach((dir, i) => {
    drills.push({
      id: `p-nav-tree2-${i}`,
      difficulty: 2,
      prompt: `Виведи деревовидну структуру директорії ${dir}.`,
      hint: `tree ${dir}`,
      solution: `tree ${dir}`,
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, dir),
    });
  });

  // realpath — resolves a relative/messy path to its canonical absolute form.
  const REALPATH_CASES = [
    { input: 'projects/../documents', expect: '/home/student/documents' },
    { input: 'projects/webapp/src/..', expect: '/home/student/projects/webapp' },
    { input: '../student/k8s', expect: '/home/student/k8s' },
  ];
  REALPATH_CASES.forEach((c, i) => {
    drills.push({
      id: `p-nav-realpath-${i}`,
      difficulty: 3,
      prompt: `Визнач канонічний абсолютний шлях для "${c.input}" за допомогою realpath.`,
      hint: `realpath '${c.input}'`,
      solution: `realpath '${c.input}'`,
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result) === c.expect,
    });
  });

  return drills;
}

module.exports = { build };
