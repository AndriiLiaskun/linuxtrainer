'use strict';
const h = require('../helpers');

const KILLABLE = [
  { pid: 890, name: 'python3 app.py' },
  { pid: 1044, name: 'node server.js' },
  { pid: 343, name: 'nginx: worker process' },
];

const GREP_TARGETS = ['node', 'python3', 'nginx', 'sshd', 'bash'];

const DU_DIRS = ['projects', 'documents', 'projects/webapp'];

function build() {
  const drills = [];

  KILLABLE.forEach((p, i) => {
    drills.push({
      id: `p-proc-kill-${i}`,
      difficulty: 2,
      prompt: `Заверши процес "${p.name}" (PID ${p.pid}).`,
      hint: `kill ${p.pid}`,
      solution: `kill ${p.pid}`,
      xp: 20,
      check: (ctx) => !ctx.state.processes.some((proc) => proc.pid === p.pid),
    });
  });

  GREP_TARGETS.forEach((t, i) => {
    drills.push({
      id: `p-proc-grep-${i}`,
      difficulty: 2,
      prompt: `Знайди серед запущених процесів той, що містить "${t}" (скомбінуй ps і grep).`,
      hint: `ps aux | grep ${t}`,
      solution: `ps aux | grep ${t}`,
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, t),
    });
  });

  DU_DIRS.forEach((d, i) => {
    drills.push({
      id: `p-proc-du-${i}`,
      difficulty: 2,
      prompt: `Дізнайся розмір директорії ${d} у зручному для читання форматі.`,
      hint: `du -sh ${d}`,
      solution: `du -sh ${d}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, d),
    });
  });

  drills.push({
    id: 'p-proc-free',
    difficulty: 1,
    prompt: "Перевір пам'ять системи у зручному форматі.",
    hint: 'free -h',
    solution: 'free -h',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Mem:'),
  });
  drills.push({
    id: 'p-proc-df',
    difficulty: 1,
    prompt: 'Перевір використання дискового простору у зручному форматі.',
    hint: 'df -h',
    solution: 'df -h',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Filesystem'),
  });
  drills.push({
    id: 'p-proc-uptime',
    difficulty: 1,
    prompt: 'Перевір, скільки часу система працює без перезавантаження.',
    hint: 'uptime',
    solution: 'uptime',
    xp: 10,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'load average'),
  });
  drills.push({
    id: 'p-proc-ps-plain',
    difficulty: 1,
    prompt: 'Виведи короткий список процесів (без додаткових прапорців).',
    hint: 'ps',
    solution: 'ps',
    xp: 10,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'PID'),
  });
  drills.push({
    id: 'p-proc-whoami',
    difficulty: 1,
    prompt: "Дізнайся ім'я поточного користувача.",
    hint: 'whoami',
    solution: 'whoami',
    xp: 10,
    check: (ctx) => h.stdoutTrim(ctx.result) === 'student',
  });

  return drills;
}

module.exports = { build };
