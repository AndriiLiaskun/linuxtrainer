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

  // chown owner:group in one shot.
  const OWNER_GROUP = [
    { owner: 'alice', group: 'devs' },
    { owner: 'bob', group: 'staging' },
    { owner: 'root', group: 'admins' },
  ];
  OWNER_GROUP.forEach((og, i) => {
    const name = `og${i}.txt`;
    drills.push({
      id: `p-perm-chown-group-${i}`,
      difficulty: 3,
      prompt: `Створи файл ${name} і встанови водночас власника ${og.owner} та групу ${og.group} (owner:group).`,
      hint: `touch ${name} && chown ${og.owner}:${og.group} ${name}`,
      solution: `touch ${name} && chown ${og.owner}:${og.group} ${name}`,
      xp: 25,
      check: (ctx) => {
        const n = ctx.fs.getNode(`/home/student/${name}`);
        return !!n && n.owner === og.owner && n.group === og.group;
      },
    });
  });

  // chmod on a directory, not just files.
  const DIR_MODES = [
    { mode: 0o700, str: '700' },
    { mode: 0o755, str: '755' },
    { mode: 0o750, str: '750' },
  ];
  DIR_MODES.forEach((m, i) => {
    const name = `secure-dir${i}`;
    drills.push({
      id: `p-perm-dirmode-${i}`,
      difficulty: 2,
      prompt: `Створи директорію ${name} і встанови їй права ${m.str}.`,
      hint: `mkdir ${name} && chmod ${m.str} ${name}`,
      solution: `mkdir ${name} && chmod ${m.str} ${name}`,
      xp: 20,
      check: (ctx) => h.modeIs(ctx.fs, `/home/student/${name}`, m.mode),
    });
  });

  // Chained symbolic operations in one chmod call (comma-separated).
  const CHAINED_SYMBOLIC = [
    { spec: 'u+x,g-w', diff: 3, check: (m) => (m & 0o100) !== 0 && (m & 0o020) === 0, desc: 'додай власнику виконання, забери у групи запис' },
    { spec: 'go-rwx', diff: 3, check: (m) => (m & 0o077) === 0, desc: 'забери всі права у групи та інших' },
    { spec: 'u=rwx,g=rx,o=', diff: 3, check: (m) => m === 0o750, desc: 'встанови точно rwx для власника, r-x для групи, нічого для інших' },
  ];
  CHAINED_SYMBOLIC.forEach((s, i) => {
    const name = `chain${i}.sh`;
    drills.push({
      id: `p-perm-chain-${i}`,
      difficulty: s.diff,
      prompt: `Створи файл ${name} і одним викликом chmod ${s.desc}.`,
      hint: `touch ${name} && chmod ${s.spec} ${name}`,
      solution: `touch ${name} && chmod ${s.spec} ${name}`,
      xp: 30,
      check: (ctx) => {
        const n = ctx.fs.getNode(`/home/student/${name}`);
        return !!n && s.check(n.mode);
      },
    });
  });

  // stat — inspect metadata instead of just setting it.
  const STAT_TARGETS = ['documents/notes.txt', 'projects/webapp/deploy.sh'];
  STAT_TARGETS.forEach((path, i) => {
    drills.push({
      id: `p-perm-stat-${i}`,
      difficulty: 2,
      prompt: `Переглянь детальну інформацію (метадані) про файл ${path} командою stat.`,
      hint: `stat ${path}`,
      solution: `stat ${path}`,
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'Access:'),
    });
  });

  // ls -l | grep combo to confirm a permission change is visible in listing.
  const VISIBLE_CHECKS = [
    { mode: '600', pattern: '-rw-------', diff: 2 },
    { mode: '755', pattern: '-rwxr-xr-x', diff: 2 },
    { mode: '400', pattern: '-r--------', diff: 3 },
  ];
  VISIBLE_CHECKS.forEach((v, i) => {
    const name = `visible${i}.txt`;
    drills.push({
      id: `p-perm-visible-${i}`,
      difficulty: v.diff,
      prompt: `Створи файл ${name}, встанови права ${v.mode}, і переконайся через ls -l | grep, що право відображається правильно.`,
      hint: `touch ${name} && chmod ${v.mode} ${name} && ls -l | grep ${name}`,
      solution: `touch ${name} && chmod ${v.mode} ${name} && ls -l | grep ${name}`,
      xp: 25,
      check: (ctx) => h.stdoutIncludes(ctx.result, v.pattern),
    });
  });

  drills.push({
    id: 'p-perm-umask',
    difficulty: 1,
    prompt: "Перевір поточну маску прав за замовчуванням (umask) для нових файлів.",
    hint: 'umask',
    solution: 'umask',
    xp: 10,
    check: (ctx) => h.succeeded(ctx.result) && /^\d+$/.test(h.stdoutTrim(ctx.result)),
  });

  return drills;
}

module.exports = { build };
