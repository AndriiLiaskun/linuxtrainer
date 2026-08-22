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

  // multi-file touch and multi-file cp into a directory (real-world batch ops).
  NAMES.slice(0, 4).forEach((name, i) => {
    const files = [`${name}-a.txt`, `${name}-b.txt`, `${name}-c.txt`];
    drills.push({
      id: `p-files-touch-multi-${i}`,
      difficulty: 2,
      prompt: `Створи одразу три файли: ${files.join(', ')} однією командою touch.`,
      hint: `touch ${files.join(' ')}`,
      solution: `touch ${files.join(' ')}`,
      xp: 20,
      check: (ctx) => files.every((f) => h.isFile(ctx.fs, `/home/student/${f}`)),
    });
  });

  NAMES.slice(0, 4).forEach((name, i) => {
    const dir = `${name}-dest`;
    drills.push({
      id: `p-files-cp-into-dir-${i}`,
      difficulty: 3,
      prompt: `Створи файл ${name}.txt і директорію ${dir}, потім скопіюй файл У цю директорію (без перейменування).`,
      hint: `touch ${name}.txt && mkdir ${dir} && cp ${name}.txt ${dir}/`,
      solution: `touch ${name}.txt && mkdir ${dir} && cp ${name}.txt ${dir}/`,
      xp: 25,
      check: (ctx) => h.isFile(ctx.fs, `/home/student/${dir}/${name}.txt`),
    });
  });

  // mv multiple files into a directory at once.
  NAMES.slice(4, 8).forEach((name, i) => {
    const dir = `${name}-archive`;
    const files = [`${name}1.log`, `${name}2.log`];
    drills.push({
      id: `p-files-mv-multi-${i}`,
      difficulty: 3,
      prompt: `Створи директорію ${dir} і файли ${files.join(', ')}, потім перемісти обидва файли в цю директорію однією командою mv.`,
      hint: `mkdir ${dir} && touch ${files.join(' ')} && mv ${files.join(' ')} ${dir}/`,
      solution: `mkdir ${dir} && touch ${files.join(' ')} && mv ${files.join(' ')} ${dir}/`,
      xp: 30,
      check: (ctx) => files.every((f) => h.isFile(ctx.fs, `/home/student/${dir}/${f}`)) && files.every((f) => h.notExists(ctx.fs, `/home/student/${f}`)),
    });
  });

  // glob-based bulk delete.
  NAMES.slice(0, 3).forEach((name, i) => {
    drills.push({
      id: `p-files-rm-glob-${i}`,
      difficulty: 3,
      prompt: `Створи файли ${name}1.tmp, ${name}2.tmp, ${name}3.tmp, потім видали всі файли з розширенням .tmp однією командою (використай глоб).`,
      hint: `touch ${name}1.tmp ${name}2.tmp ${name}3.tmp && rm *.tmp`,
      solution: `touch ${name}1.tmp ${name}2.tmp ${name}3.tmp && rm *.tmp`,
      xp: 30,
      check: (ctx) =>
        h.notExists(ctx.fs, `/home/student/${name}1.tmp`) &&
        h.notExists(ctx.fs, `/home/student/${name}2.tmp`) &&
        h.notExists(ctx.fs, `/home/student/${name}3.tmp`),
    });
  });

  // file / stat sanity checks on freshly created files.
  NAMES.slice(0, 3).forEach((name, i) => {
    drills.push({
      id: `p-files-filetype-${i}`,
      difficulty: 1,
      prompt: `Створи файл ${name}.dat і перевір його тип командою file.`,
      hint: `touch ${name}.dat && file ${name}.dat`,
      solution: `touch ${name}.dat && file ${name}.dat`,
      xp: 15,
      check: (ctx) => h.succeeded(ctx.result),
    });
  });

  // rmdir — removes an EMPTY directory only (unlike rm -r).
  NAMES.slice(0, 4).forEach((name, i) => {
    const dir = `${name}-empty`;
    drills.push({
      id: `p-files-rmdir-${i}`,
      difficulty: 2,
      prompt: `Створи порожню директорію ${dir} і видали її командою rmdir.`,
      hint: `mkdir ${dir} && rmdir ${dir}`,
      solution: `mkdir ${dir} && rmdir ${dir}`,
      xp: 20,
      check: (ctx) => h.notExists(ctx.fs, `/home/student/${dir}`),
    });
  });
  drills.push({
    id: 'p-files-rmdir-fails-nonempty',
    difficulty: 3,
    prompt: 'Створи директорію full-dir з файлом всередині, і переконайся, що rmdir ВІДМОВЛЯЄТЬСЯ видаляти непорожню директорію (помилка).',
    hint: 'mkdir full-dir && touch full-dir/f.txt && rmdir full-dir',
    solution: 'mkdir full-dir && touch full-dir/f.txt && rmdir full-dir',
    xp: 25,
    check: (ctx) => ctx.result.code !== 0 && h.isDir(ctx.fs, '/home/student/full-dir'),
  });

  return drills;
}

module.exports = { build };
