'use strict';
const h = require('../helpers');

const NUMERIC_MODES = [
  { mode: 0o600, str: '600', diff: 1 },
  { mode: 0o644, str: '644', diff: 1 },
  { mode: 0o700, str: '700', diff: 1 },
  { mode: 0o755, str: '755', diff: 2 },
  { mode: 0o750, str: '750', diff: 2 },
  { mode: 0o640, str: '640', diff: 2 },
  { mode: 0o444, str: '444', diff: 2 },
  { mode: 0o777, str: '777', diff: 2 },
  { mode: 0, str: '000', diff: 1 },
];

const SYMBOLIC = [
  { spec: 'u+x', diff: 2, check: (m) => (m & 0o100) !== 0, desc: 'додай власнику право на виконання' },
  { spec: 'g+w', diff: 2, check: (m) => (m & 0o020) !== 0, desc: 'додай групі право на запис' },
  { spec: 'o-r', diff: 3, check: (m) => (m & 0o004) === 0, desc: "прибери в інших ('other') право на читання" },
  { spec: 'go-w', diff: 3, check: (m) => (m & 0o022) === 0, desc: 'прибери право на запис у групи та інших' },
  { spec: 'a+x', diff: 2, check: (m) => (m & 0o111) === 0o111, desc: 'додай право на виконання усім' },
  { spec: 'u-w', diff: 3, check: (m) => (m & 0o200) === 0, desc: 'прибери у власника право на запис' },
];

const NAMES = ['secret', 'config', 'script', 'key', 'data', 'app', 'log', 'cache', 'token'];

function build() {
  const drills = [];

  NUMERIC_MODES.forEach((m, i) => {
    const name = NAMES[i % NAMES.length] + i + '.txt';
    drills.push({
      id: `p-perm-num-${i}`,
      difficulty: m.diff,
      prompt: `Створи файл ${name} і встанови права доступу ${m.str} (числовий режим).`,
      hint: `touch ${name} && chmod ${m.str} ${name}`,
      solution: `touch ${name} && chmod ${m.str} ${name}`,
      xp: 15 + m.diff * 5,
      check: (ctx) => h.modeIs(ctx.fs, `/home/student/${name}`, m.mode),
    });
  });

  SYMBOLIC.forEach((s, i) => {
    const name = 'sym' + i + '.sh';
    drills.push({
      id: `p-perm-sym-${i}`,
      difficulty: s.diff,
      prompt: `Створи файл ${name} з правами 644, потім ${s.desc} (символьний режим), не чіпаючи інші права.`,
      hint: `touch ${name} && chmod 644 ${name} && chmod ${s.spec} ${name}`,
      solution: `touch ${name} && chmod 644 ${name} && chmod ${s.spec} ${name}`,
      xp: 20 + s.diff * 5,
      check: (ctx) => {
        const n = ctx.fs.getNode(`/home/student/${name}`);
        return !!n && s.check(n.mode);
      },
    });
  });

  ['alice', 'bob', 'carol', 'root'].forEach((owner, i) => {
    const name = `owned${i}.txt`;
    drills.push({
      id: `p-perm-chown-${i}`,
      difficulty: 2,
      prompt: `Створи файл ${name} і зміни його власника на ${owner}.`,
      hint: `touch ${name} && chown ${owner} ${name}`,
      solution: `touch ${name} && chown ${owner} ${name}`,
      xp: 20,
      check: (ctx) => h.ownerIs(ctx.fs, `/home/student/${name}`, owner),
    });
  });

  return drills;
}

module.exports = { build };
