'use strict';
const h = require('../helpers');

// Read-only against the fixed seeded files — safe to repeat from any fresh Shell.
const FILES = [
  { path: 'documents/notes.txt', lines: 3, label: 'documents/notes.txt' },
  { path: 'documents/report.csv', lines: 4, label: 'documents/report.csv' },
  { path: 'documents/inventory.csv', lines: 6, label: 'documents/inventory.csv' },
  { path: 'documents/servers.txt', lines: 5, label: 'documents/servers.txt' },
  { path: 'projects/webapp/logs/app.log', lines: 6, label: 'projects/webapp/logs/app.log' },
];

function build() {
  const drills = [];

  FILES.forEach((f, i) => {
    const n = Math.min(2, f.lines);
    drills.push({
      id: `p-view-head-${i}`,
      difficulty: 1,
      prompt: `Виведи перші ${n} рядки файлу ${f.label}.`,
      hint: `head -n ${n} ${f.path}`,
      solution: `head -n ${n} ${f.path}`,
      xp: 15,
      check: (ctx) => h.stdoutLines(ctx.result).length === n,
    });
    const t = Math.min(2, f.lines);
    drills.push({
      id: `p-view-tail-${i}`,
      difficulty: 1,
      prompt: `Виведи останні ${t} рядки файлу ${f.label}.`,
      hint: `tail -n ${t} ${f.path}`,
      solution: `tail -n ${t} ${f.path}`,
      xp: 15,
      check: (ctx) => h.stdoutLines(ctx.result).length === t,
    });
    drills.push({
      id: `p-view-wc-${i}`,
      difficulty: 1,
      prompt: `Порахуй кількість рядків у файлі ${f.label}.`,
      hint: `wc -l ${f.path}`,
      solution: `wc -l ${f.path}`,
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result).split(/\s+/)[0] === String(f.lines),
    });
    drills.push({
      id: `p-view-cat-${i}`,
      difficulty: 1,
      prompt: `Виведи весь вміст файлу ${f.label}.`,
      hint: `cat ${f.path}`,
      solution: `cat ${f.path}`,
      xp: 10,
      check: (ctx) => h.stdoutLines(ctx.result).length === f.lines,
    });
    drills.push({
      id: `p-view-catn-${i}`,
      difficulty: 2,
      prompt: `Виведи вміст файлу ${f.label} із нумерацією рядків.`,
      hint: `cat -n ${f.path}`,
      solution: `cat -n ${f.path}`,
      xp: 15,
      check: (ctx) => /^\s*1\t/m.test(ctx.result.stdout),
    });
  });

  // head/tail with varying N (not just the same "2" every time).
  FILES.forEach((f, i) => {
    [1, 3].forEach((n, j) => {
      if (n > f.lines) return;
      drills.push({
        id: `p-view-head-n-${i}-${j}`,
        difficulty: 1,
        prompt: `Виведи перші ${n} рядки файлу ${f.label}.`,
        hint: `head -n ${n} ${f.path}`,
        solution: `head -n ${n} ${f.path}`,
        xp: 15,
        check: (ctx) => h.stdoutLines(ctx.result).length === n,
      });
      drills.push({
        id: `p-view-tail-n-${i}-${j}`,
        difficulty: 1,
        prompt: `Виведи останні ${n} рядки файлу ${f.label}.`,
        hint: `tail -n ${n} ${f.path}`,
        solution: `tail -n ${n} ${f.path}`,
        xp: 15,
        check: (ctx) => h.stdoutLines(ctx.result).length === n,
      });
    });
  });

  // wc -w / -c variants (word/character counts, not just lines).
  const WC_CASES = [
    { path: 'documents/notes.txt', flag: 'w', label: 'слів', idx: 1 },
    { path: 'documents/servers.txt', flag: 'w', label: 'слів', idx: 4 },
  ];
  WC_CASES.forEach((c, i) => {
    drills.push({
      id: `p-view-wcflag-${i}`,
      difficulty: 2,
      prompt: `Порахуй кількість ${c.label} у файлі ${c.path}.`,
      hint: `wc -${c.flag} ${c.path}`,
      solution: `wc -${c.flag} ${c.path}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && /^\d+/.test(h.stdoutTrim(ctx.result)),
    });
  });

  // cat multiple files at once.
  const CAT_PAIRS = [
    ['documents/notes.txt', 'documents/servers.txt'],
    ['documents/report.csv', 'documents/inventory.csv'],
  ];
  CAT_PAIRS.forEach((pair, i) => {
    drills.push({
      id: `p-view-cat-multi-${i}`,
      difficulty: 2,
      prompt: `Виведи вміст файлів ${pair[0]} і ${pair[1]} одразу, однією командою.`,
      hint: `cat ${pair[0]} ${pair[1]}`,
      solution: `cat ${pair[0]} ${pair[1]}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && (ctx.result.stdout || '').split('\n').length > 4,
    });
  });

  // head|tail combo — pick a specific middle line (a genuinely useful trick).
  const MIDDLE_LINES = [
    { path: 'projects/webapp/logs/app.log', line: 3, head: 3, expect: 'WARN High memory usage' },
    { path: 'projects/webapp/logs/app.log', line: 4, head: 4, expect: 'ERROR Failed to connect to database' },
    { path: 'documents/inventory.csv', line: 3, head: 3, expect: '2,monitor,4,180' },
  ];
  MIDDLE_LINES.forEach((m, i) => {
    drills.push({
      id: `p-view-middle-${i}`,
      difficulty: 3,
      prompt: `Виведи ЛИШЕ рядок №${m.line} файлу ${m.path}, скомбінувавши head і tail через пайп.`,
      hint: `head -n ${m.head} ${m.path} | tail -n 1`,
      solution: `head -n ${m.head} ${m.path} | tail -n 1`,
      xp: 30,
      check: (ctx) => h.stdoutTrim(ctx.result).endsWith(m.expect),
    });
  });

  // skip the CSV header with tail -n +2, then count remaining data rows.
  const HEADER_SKIP = [
    { path: 'documents/report.csv', rows: 3 },
    { path: 'documents/inventory.csv', rows: 5 },
  ];
  HEADER_SKIP.forEach((c, i) => {
    drills.push({
      id: `p-view-skiphdr-${i}`,
      difficulty: 3,
      prompt: `Пропусти заголовок і порахуй кількість рядків даних у ${c.path} (tail -n +2, потім wc -l).`,
      hint: `tail -n +2 ${c.path} | wc -l`,
      solution: `tail -n +2 ${c.path} | wc -l`,
      xp: 30,
      check: (ctx) => h.stdoutTrim(ctx.result).split(/\s+/)[0] === String(c.rows),
    });
  });

  // less — pager for viewing a file's content.
  ['documents/notes.txt', 'documents/servers.txt', 'projects/webapp/logs/app.log'].forEach((path, i) => {
    drills.push({
      id: `p-view-less-${i}`,
      difficulty: 1,
      prompt: `Перегляни вміст файлу ${path} через less.`,
      hint: `less ${path}`,
      solution: `less ${path}`,
      xp: 10,
      check: (ctx) => h.succeeded(ctx.result) && ctx.result.stdout.length > 0,
    });
  });

  return drills;
}

module.exports = { build };
