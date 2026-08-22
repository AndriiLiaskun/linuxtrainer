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

  return drills;
}

module.exports = { build };
