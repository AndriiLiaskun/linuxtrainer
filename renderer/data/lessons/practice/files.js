'use strict';
const h = require('../helpers');

const NAMES = ['alpha', 'beta', 'gamma', 'report', 'notes2', 'cache', 'backup', 'draft', 'output', 'temp'];

function build() {
  const drills = [];

  NAMES.forEach((name, i) => {
    drills.push({
      id: `p-files-touch-${i}`,
      difficulty: 1,
      prompt: `Створи порожній файл з назвою ${name}.txt.`,
      hint: `touch ${name}.txt`,
      solution: `touch ${name}.txt`,
      xp: 10,
      check: (ctx) => h.isFile(ctx.fs, `/home/student/${name}.txt`),
    });
  });

  NAMES.slice(0, 6).forEach((name, i) => {
    drills.push({
      id: `p-files-mkdir-${i}`,
      difficulty: 1,
      prompt: `Створи директорію з назвою ${name}-dir.`,
      hint: `mkdir ${name}-dir`,
      solution: `mkdir ${name}-dir`,
      xp: 10,
      check: (ctx) => h.isDir(ctx.fs, `/home/student/${name}-dir`),
    });
  });

  NAMES.slice(0, 5).forEach((name, i) => {
    drills.push({
      id: `p-files-mkdirp-${i}`,
      difficulty: 2,
      prompt: `Створи вкладену структуру ${name}/nested/deep однією командою (проміжні директорії ще не існують).`,
      hint: `mkdir -p ${name}/nested/deep`,
      solution: `mkdir -p ${name}/nested/deep`,
      xp: 20,
      check: (ctx) => h.isDir(ctx.fs, `/home/student/${name}/nested/deep`),
    });
  });

  NAMES.slice(0, 6).forEach((name, i) => {
    drills.push({
      id: `p-files-cp-${i}`,
      difficulty: 2,
      prompt: `Створи файл ${name}.txt із вмістом "hello" і скопіюй його в ${name}-copy.txt.`,
      hint: `echo hello > ${name}.txt && cp ${name}.txt ${name}-copy.txt`,
      solution: `echo hello > ${name}.txt && cp ${name}.txt ${name}-copy.txt`,
      xp: 20,
      check: (ctx) => h.contentEquals(ctx.fs, `/home/student/${name}-copy.txt`, 'hello\n'),
    });
  });

  NAMES.slice(0, 6).forEach((name, i) => {
    drills.push({
      id: `p-files-mv-${i}`,
      difficulty: 2,
      prompt: `Створи файл ${name}-old.txt і перейменуй його на ${name}-new.txt.`,
      hint: `touch ${name}-old.txt && mv ${name}-old.txt ${name}-new.txt`,
      solution: `touch ${name}-old.txt && mv ${name}-old.txt ${name}-new.txt`,
      xp: 20,
      check: (ctx) => h.notExists(ctx.fs, `/home/student/${name}-old.txt`) && h.isFile(ctx.fs, `/home/student/${name}-new.txt`),
    });
  });

  NAMES.slice(0, 6).forEach((name, i) => {
    drills.push({
      id: `p-files-rm-${i}`,
      difficulty: 1,
      prompt: `Створи файл ${name}-junk.txt і одразу видали його.`,
      hint: `touch ${name}-junk.txt && rm ${name}-junk.txt`,
      solution: `touch ${name}-junk.txt && rm ${name}-junk.txt`,
      xp: 15,
      check: (ctx) => h.notExists(ctx.fs, `/home/student/${name}-junk.txt`),
    });
  });

  NAMES.slice(0, 4).forEach((name, i) => {
    drills.push({
      id: `p-files-rmrf-${i}`,
      difficulty: 2,
      prompt: `Створи директорію ${name}-tree з файлом всередині (${name}-tree/a.txt), а потім видали всю директорію разом із вмістом.`,
      hint: `mkdir ${name}-tree && touch ${name}-tree/a.txt && rm -rf ${name}-tree`,
      solution: `mkdir ${name}-tree && touch ${name}-tree/a.txt && rm -rf ${name}-tree`,
      xp: 20,
      check: (ctx) => h.notExists(ctx.fs, `/home/student/${name}-tree`),
    });
  });

  NAMES.slice(0, 4).forEach((name, i) => {
    drills.push({
      id: `p-files-ln-${i}`,
      difficulty: 3,
      prompt: `Створи символьне посилання ${name}-link, що вказує на директорію projects.`,
      hint: `ln -s projects ${name}-link`,
      solution: `ln -s projects ${name}-link`,
      xp: 25,
      check: (ctx) => h.isSymlink(ctx.fs, `/home/student/${name}-link`),
    });
  });

  return drills;
}

module.exports = { build };
