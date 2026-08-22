'use strict';
const h = require('../helpers');

const VARS = [
  { name: 'APP_ENV', value: 'production' },
  { name: 'STAGE', value: 'staging' },
  { name: 'REGION', value: 'eu-west-1' },
  { name: 'VERSION', value: '2.4.1' },
  { name: 'MODE', value: 'debug' },
];

function build() {
  const drills = [];

  VARS.forEach((v, i) => {
    drills.push({
      id: `p-script-assign-${i}`,
      difficulty: 1,
      prompt: `Створи змінну ${v.name} зі значенням ${v.value} і одразу виведи її.`,
      hint: `${v.name}=${v.value} && echo $${v.name}`,
      solution: `${v.name}=${v.value} && echo $${v.name}`,
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result) === v.value,
    });
    drills.push({
      id: `p-script-quotes-${i}`,
      difficulty: 2,
      prompt: `Створи змінну ${v.name}=${v.value} і виведи "Value: $${v.name}" у подвійних лапках.`,
      hint: `${v.name}=${v.value} && echo "Value: $${v.name}"`,
      solution: `${v.name}=${v.value} && echo "Value: $${v.name}"`,
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result) === `Value: ${v.value}`,
    });
    drills.push({
      id: `p-script-export-${i}`,
      difficulty: 2,
      prompt: `Експортуй змінну ${v.name} зі значенням ${v.value}.`,
      hint: `export ${v.name}=${v.value}`,
      solution: `export ${v.name}=${v.value}`,
      xp: 15,
      check: (ctx) => ctx.fs.env[v.name] === v.value,
    });
  });

  const RANGES = [
    { from: 1, to: 3 },
    { from: 1, to: 5 },
    { from: 3, to: 6 },
    { from: 10, to: 12 },
  ];
  RANGES.forEach((r, i) => {
    const nums = [];
    for (let n = r.from; n <= r.to; n++) nums.push(n);
    drills.push({
      id: `p-script-for-${i}`,
      difficulty: 2,
      prompt: `Напиши цикл for, який виводить числа від ${r.from} до ${r.to} включно, кожне на своєму рядку.`,
      hint: `for i in ${nums.join(' ')}; do echo $i; done`,
      solution: `for i in ${nums.join(' ')}; do echo $i; done`,
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result) === nums.join('\n'),
    });
  });

  const FILE_LOOPS = [
    { prefix: 'srv', count: 3 },
    { prefix: 'node', count: 4 },
    { prefix: 'log', count: 3 },
  ];
  FILE_LOOPS.forEach((f, i) => {
    const nums = Array.from({ length: f.count }, (_, k) => k + 1);
    drills.push({
      id: `p-script-for-touch-${i}`,
      difficulty: 3,
      prompt: `Напиши цикл for, який створює файли ${f.prefix}1.txt ... ${f.prefix}${f.count}.txt.`,
      hint: `for n in ${nums.join(' ')}; do touch ${f.prefix}$n.txt; done`,
      solution: `for n in ${nums.join(' ')}; do touch ${f.prefix}$n.txt; done`,
      xp: 30,
      check: (ctx) => nums.every((n) => h.isFile(ctx.fs, `/home/student/${f.prefix}${n}.txt`)),
    });
  });

  const IF_CHECKS = [
    { path: 'documents/notes.txt', flag: '-f', exists: true },
    { path: 'documents/ghost.txt', flag: '-f', exists: false },
    { path: 'projects', flag: '-d', exists: true },
    { path: 'nowhere', flag: '-d', exists: false },
  ];
  IF_CHECKS.forEach((c, i) => {
    drills.push({
      id: `p-script-if-${i}`,
      difficulty: 3,
      prompt: `Використай умову if, щоб вивести "yes", якщо ${c.flag === '-f' ? 'файл' : 'директорія'} ${c.path} існує, інакше "no".`,
      hint: `if [ ${c.flag} ${c.path} ]; then echo yes; else echo no; fi`,
      solution: `if [ ${c.flag} ${c.path} ]; then echo yes; else echo no; fi`,
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result) === (c.exists ? 'yes' : 'no'),
    });
  });

  drills.push({
    id: 'p-script-cmdsub-pwd',
    difficulty: 3,
    prompt: 'Використай підстановку команди $(...), щоб вивести "Path: <поточна_директорія>".',
    hint: 'echo "Path: $(pwd)"',
    solution: 'echo "Path: $(pwd)"',
    xp: 25,
    check: (ctx) => h.stdoutTrim(ctx.result) === 'Path: /home/student',
  });
  drills.push({
    id: 'p-script-cmdsub-whoami',
    difficulty: 3,
    prompt: 'Використай $(...) щоб вивести "User: <поточний_користувач>".',
    hint: 'echo "User: $(whoami)"',
    solution: 'echo "User: $(whoami)"',
    xp: 25,
    check: (ctx) => h.stdoutTrim(ctx.result) === 'User: student',
  });
  drills.push({
    id: 'p-script-exitcode',
    difficulty: 3,
    prompt: 'Виконай команду, яка провалиться (перейди в /no-such-place), а потім виведи код завершення $?.',
    hint: 'cd /no-such-place; echo $?',
    solution: 'cd /no-such-place; echo $?',
    xp: 25,
    check: (ctx) => h.stdoutTrim(ctx.result) !== '0',
  });

  return drills;
}

module.exports = { build };
