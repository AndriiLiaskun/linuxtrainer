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

  return drills;
}

module.exports = { build };
