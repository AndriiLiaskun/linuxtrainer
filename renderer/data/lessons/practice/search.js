'use strict';
const h = require('../helpers');

const LOG = 'projects/webapp/logs/app.log';
const WORDS = [
  { word: 'INFO', count: 3, diff: 1 },
  { word: 'WARN', count: 1, diff: 1 },
  { word: 'ERROR', count: 2, diff: 1 },
];

function build() {
  const drills = [];

  WORDS.forEach((w, i) => {
    drills.push({
      id: `p-search-grep-plain-${i}`,
      difficulty: w.diff,
      prompt: `Знайди всі рядки зі словом ${w.word} у файлі ${LOG}.`,
      hint: `grep ${w.word} ${LOG}`,
      solution: `grep ${w.word} ${LOG}`,
      xp: 15,
      check: (ctx) => h.stdoutLines(ctx.result).length === w.count,
    });
    drills.push({
      id: `p-search-grep-count-${i}`,
      difficulty: 1,
      prompt: `Виведи ЛИШЕ кількість рядків зі словом ${w.word} у файлі ${LOG}.`,
      hint: `grep -c ${w.word} ${LOG}`,
      solution: `grep -c ${w.word} ${LOG}`,
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result) === String(w.count),
    });
    drills.push({
      id: `p-search-grep-n-${i}`,
      difficulty: 2,
      prompt: `Знайди рядки зі словом ${w.word} у файлі ${LOG} разом із номерами рядків.`,
      hint: `grep -n ${w.word} ${LOG}`,
      solution: `grep -n ${w.word} ${LOG}`,
      xp: 20,
      check: (ctx) => h.stdoutLines(ctx.result).length === w.count && /^\d+:/m.test(ctx.result.stdout),
    });
    drills.push({
      id: `p-search-grep-lower-${i}`,
      difficulty: 2,
      prompt: `Знайди рядки зі словом "${w.word.toLowerCase()}" (у нижньому регістрі) у файлі ${LOG}, ігноруючи регістр.`,
      hint: `grep -i ${w.word.toLowerCase()} ${LOG}`,
      solution: `grep -i ${w.word.toLowerCase()} ${LOG}`,
      xp: 20,
      check: (ctx) => h.stdoutLines(ctx.result).length === w.count,
    });
    drills.push({
      id: `p-search-grep-pipe-wc-${i}`,
      difficulty: 3,
      prompt: `Через пайп порахуй командою wc -l, скільки рядків НЕ містять слова ${w.word}, у файлі ${LOG}.`,
      hint: `grep -v ${w.word} ${LOG} | wc -l`,
      solution: `grep -v ${w.word} ${LOG} | wc -l`,
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result).split(/\s+/)[0] === String(6 - w.count),
    });
  });

  const NOTES_WORDS = [
    { word: 'grep', diff: 1 },
    { word: 'coffee', diff: 1 },
    { word: 'Deploy', diff: 1 },
  ];
  NOTES_WORDS.forEach((w, i) => {
    drills.push({
      id: `p-search-notes-${i}`,
      difficulty: w.diff,
      prompt: `Знайди рядок зі словом "${w.word}" у файлі documents/notes.txt.`,
      hint: `grep ${w.word} documents/notes.txt`,
      solution: `grep ${w.word} documents/notes.txt`,
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, w.word),
    });
  });

  const EXT_FINDS = [
    { ext: '*.py', dir: 'projects', diff: 2, expect: 'app.py' },
    { ext: '*.md', dir: 'projects', diff: 2, expect: 'README.md' },
    { ext: '*.log', dir: 'projects', diff: 2, expect: 'app.log' },
    { ext: '*.sh', dir: 'projects', diff: 2, expect: 'deploy.sh' },
    { ext: '*.yaml', dir: 'k8s', diff: 2, expect: '.yaml' },
  ];
  EXT_FINDS.forEach((e, i) => {
    drills.push({
      id: `p-search-find-ext-${i}`,
      difficulty: e.diff,
      prompt: `Знайди всі файли з розширенням ${e.ext.replace('*', '')} у директорії ${e.dir}.`,
      hint: `find ${e.dir} -name '${e.ext}'`,
      solution: `find ${e.dir} -name '${e.ext}'`,
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, e.expect),
    });
  });

  drills.push({
    id: 'p-search-find-type-d',
    difficulty: 2,
    prompt: 'Знайди всі директорії всередині projects.',
    hint: 'find projects -type d',
    solution: 'find projects -type d',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'src') && h.stdoutIncludes(ctx.result, 'logs'),
  });

  drills.push({
    id: 'p-search-servers-web',
    difficulty: 2,
    prompt: 'У файлі documents/servers.txt знайди усі сервери, назва яких починається з "web".',
    hint: "grep '^web' documents/servers.txt",
    solution: "grep '^web' documents/servers.txt",
    xp: 20,
    check: (ctx) => h.stdoutLines(ctx.result).length === 2 && h.stdoutIncludes(ctx.result, 'web-01'),
  });

  // grep -w — whole-word match (avoids partial substring false positives).
  drills.push({
    id: 'p-search-grep-w',
    difficulty: 3,
    prompt: `Знайди рядки, де слово "connect" зустрічається як ОКРЕМЕ слово (не частина іншого слова), у файлі ${LOG}.`,
    hint: `grep -w connect ${LOG}`,
    solution: `grep -w connect ${LOG}`,
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Failed to connect'),
  });

  // Anchored regex patterns.
  drills.push({
    id: 'p-search-anchor-start',
    difficulty: 3,
    prompt: 'У documents/servers.txt знайди рядки, що починаються рівно на "db".',
    hint: "grep '^db' documents/servers.txt",
    solution: "grep '^db' documents/servers.txt",
    xp: 25,
    check: (ctx) => h.stdoutTrim(ctx.result) === 'db-01',
  });
  drills.push({
    id: 'p-search-anchor-end',
    difficulty: 3,
    prompt: 'У documents/servers.txt знайди рядки, що закінчуються на "01".',
    hint: "grep '01$' documents/servers.txt",
    solution: "grep '01$' documents/servers.txt",
    xp: 25,
    check: (ctx) => h.stdoutLines(ctx.result).length === 4,
  });

  // Regex features beyond literal substrings: alternation, character
  // classes with quantifiers, -E extended regex (always on in this engine,
  // even without -E — see the grep cheatsheet doc for the note).
  drills.push({
    id: 'p-search-regex-alternation',
    difficulty: 3,
    prompt: `У файлі ${LOG} знайди рядки, де рівень логування WARN АБО ERROR (тобто все, крім INFO), одним регулярним виразом з альтернативою.`,
    hint: `grep -E 'WARN|ERROR' ${LOG}`,
    solution: `grep -E 'WARN|ERROR' ${LOG}`,
    xp: 30,
    check: (ctx) => h.stdoutLines(ctx.result).length === 3 && !h.stdoutIncludes(ctx.result, 'INFO'),
  });
  drills.push({
    id: 'p-search-regex-alternation-servers',
    difficulty: 3,
    prompt: 'У documents/servers.txt знайди сервери, назва яких починається на "web" АБО на "db", одним регулярним виразом.',
    hint: "grep -E '^(web|db)-' documents/servers.txt",
    solution: "grep -E '^(web|db)-' documents/servers.txt",
    xp: 30,
    check: (ctx) => h.stdoutLines(ctx.result).length === 3 && !h.stdoutIncludes(ctx.result, 'cache') && !h.stdoutIncludes(ctx.result, 'lb-'),
  });
  drills.push({
    id: 'p-search-regex-quantifier',
    difficulty: 3,
    prompt: 'У documents/inventory.csv знайди рядки, де кількість товару (третє поле) — рівно двозначне число (клас символів [0-9] з квантифікатором {2}).',
    hint: "grep -E ',[0-9]{2},' documents/inventory.csv",
    solution: "grep -E ',[0-9]{2},' documents/inventory.csv",
    xp: 30,
    check: (ctx) => h.stdoutLines(ctx.result).length === 3 && h.stdoutIncludes(ctx.result, 'keyboard') && h.stdoutIncludes(ctx.result, 'headset'),
  });

  // grep across a glob of files (not just one).
  drills.push({
    id: 'p-search-glob-grep',
    difficulty: 3,
    prompt: 'Знайди слово "TODO" в усіх .txt файлах директорії documents одразу (використай глоб *.txt).',
    hint: 'grep TODO documents/*.txt',
    solution: 'grep TODO documents/*.txt',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'TODO'),
  });

  // recursive grep across a whole directory tree.
  drills.push({
    id: 'p-search-grep-recursive',
    difficulty: 3,
    prompt: 'Знайди слово "app" рекурсивно в усіх файлах директорії projects.',
    hint: 'grep -r app projects',
    solution: 'grep -r app projects',
    xp: 30,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'app'),
  });

  // find -type f (files only, complementing the existing -type d drill).
  drills.push({
    id: 'p-search-find-type-f',
    difficulty: 2,
    prompt: 'Знайди всі звичайні файли (не директорії) всередині documents.',
    hint: 'find documents -type f',
    solution: 'find documents -type f',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'notes.txt'),
  });

  // find piped into xargs+grep — a genuinely common real-world combo.
  drills.push({
    id: 'p-search-find-xargs-grep',
    difficulty: 3,
    prompt: 'Знайди всі .log файли в projects, і для кожного виведи рядки зі словом ERROR (через find + xargs + grep).',
    hint: "find projects -name '*.log' | xargs grep ERROR",
    solution: "find projects -name '*.log' | xargs grep ERROR",
    xp: 35,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'ERROR'),
  });

  // find -size — filter by byte size (+bigger, -smaller, c=bytes).
  drills.push({
    id: 'p-search-find-size',
    difficulty: 2,
    prompt: 'Створи файл big.txt з текстом довшим за 10 байт, а потім у поточній директорії (без заглиблення в піддиректорії) знайди файли розміром понад 10 байт.',
    hint: "echo 'this is a long line' > big.txt && find . -maxdepth 1 -size +10c",
    solution: "echo 'this is a long line' > big.txt && find . -maxdepth 1 -size +10c",
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'big.txt'),
  });

  // find -user / -group — filter by ownership (chown first, then find).
  drills.push({
    id: 'p-search-find-user',
    difficulty: 3,
    prompt: 'Зміни власника файлу projects/webapp/deploy.sh на alice, а потім знайди в projects усі файли, що належать alice.',
    hint: 'chown alice projects/webapp/deploy.sh && find projects -user alice',
    solution: 'chown alice projects/webapp/deploy.sh && find projects -user alice',
    xp: 30,
    check: (ctx) => h.stdoutTrim(ctx.result) === '/home/student/projects/webapp/deploy.sh',
  });
  drills.push({
    id: 'p-search-find-group',
    difficulty: 3,
    prompt: 'Зміни групу файлу documents/notes.txt на devs, а потім знайди в documents усі файли групи devs.',
    hint: 'chown :devs documents/notes.txt && find documents -group devs',
    solution: 'chown :devs documents/notes.txt && find documents -group devs',
    xp: 30,
    check: (ctx) => h.stdoutTrim(ctx.result) === '/home/student/documents/notes.txt',
  });

  // find -maxdepth — limit how deep the search descends.
  drills.push({
    id: 'p-search-find-maxdepth',
    difficulty: 2,
    prompt: 'Знайди директорії всередині projects, НЕ заглиблюючись у вкладені піддиректорії (лише перший рівень).',
    hint: 'find projects -maxdepth 1 -type d',
    solution: 'find projects -maxdepth 1 -type d',
    xp: 25,
    check: (ctx) => {
      const lines = h.stdoutLines(ctx.result);
      return lines.includes('/home/student/projects') && lines.includes('/home/student/projects/webapp') && !lines.some((l) => l.includes('/webapp/'));
    },
  });

  // find -inum — search by inode number (as reported by stat / ls -i).
  // NOTE: 27 is documents/notes.txt's inode in a FRESH FileSystem — inode
  // numbers are assigned in file-creation order (see filesystem.js's
  // _buildDefaultTree), so this literal must be re-verified (and this
  // drill's `check` re-run) any time a file gets added/reordered earlier
  // in that seed. `node test/run.js` catches a stale value immediately.
  drills.push({
    id: 'p-search-find-inum',
    difficulty: 3,
    prompt: 'Подивись inode-номер файлу documents/notes.txt командою stat, а потім знайди цей самий файл у directory documents за цим inode-номером (find -inum).',
    hint: 'stat documents/notes.txt   (дивись рядок Inode: N) && find documents -inum N',
    solution: 'find documents -inum 27',
    xp: 30,
    check: (ctx) => h.stdoutTrim(ctx.result) === '/home/student/documents/notes.txt',
  });

  // inventory.csv item lookups (different domain than the log file).
  const INVENTORY_ITEMS = ['keyboard', 'monitor', 'webcam'];
  INVENTORY_ITEMS.forEach((item, i) => {
    drills.push({
      id: `p-search-inventory-${i}`,
      difficulty: 1,
      prompt: `Знайди рядок про товар "${item}" у файлі documents/inventory.csv.`,
      hint: `grep ${item} documents/inventory.csv`,
      solution: `grep ${item} documents/inventory.csv`,
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, item),
    });
  });

  // locate — like find, but searches by name across the WHOLE filesystem
  // without needing to specify a starting directory.
  const LOCATE_TARGETS = [
    { pattern: 'app.log', expect: '/home/student/projects/webapp/logs/app.log' },
    { pattern: 'deploy.sh', expect: '/home/student/projects/webapp/deploy.sh' },
    { pattern: 'inventory.csv', expect: '/home/student/documents/inventory.csv' },
  ];
  LOCATE_TARGETS.forEach(({ pattern, expect }, i) => {
    drills.push({
      id: `p-search-locate-${i}`,
      difficulty: 2,
      prompt: `Знайди повний шлях до файлу ${pattern} по всій файловій системі, не вказуючи, де саме шукати (locate).`,
      hint: `locate ${pattern}`,
      solution: `locate ${pattern}`,
      xp: 20,
      check: (ctx) => h.stdoutTrim(ctx.result) === expect,
    });
  });
  drills.push({
    id: 'p-search-locate-not-found',
    difficulty: 1,
    prompt: 'Спробуй знайти неіснуючий файл ghost-file.xyz через locate і переконайся, що нічого не знайдено (код завершення відмінний від 0).',
    hint: 'locate ghost-file.xyz',
    solution: 'locate ghost-file.xyz',
    xp: 15,
    check: (ctx) => h.failed(ctx.result),
  });
  drills.push({
    id: 'p-search-updatedb',
    difficulty: 2,
    prompt: 'Встанови пакет mlocate, онови базу даних locate (updatedb), а потім знайди файл notes.txt.',
    hint: 'apt install -y mlocate && updatedb && locate notes.txt',
    solution: 'apt install -y mlocate && updatedb && locate notes.txt',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, '/home/student/documents/notes.txt'),
  });

  return drills;
}

module.exports = { build };
