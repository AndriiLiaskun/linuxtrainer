'use strict';
const h = require('../helpers');

const NAMES = ['backup', 'release', 'snapshot', 'export', 'bundle'];

function build() {
  const drills = [];

  NAMES.forEach((name, i) => {
    drills.push({
      id: `p-arch-tar-create-${i}`,
      difficulty: 2,
      prompt: `Створи директорію ${name}-dir з файлом ${name}-dir/data.txt, а потім заархівуй її в ${name}.tar.`,
      hint: `mkdir ${name}-dir && touch ${name}-dir/data.txt && tar -cf ${name}.tar ${name}-dir`,
      solution: `mkdir ${name}-dir && touch ${name}-dir/data.txt && tar -cf ${name}.tar ${name}-dir`,
      xp: 25,
      check: (ctx) => h.isFile(ctx.fs, `/home/student/${name}.tar`),
    });
    drills.push({
      id: `p-arch-tar-extract-${i}`,
      difficulty: 3,
      prompt: `Створи директорію ${name}-dir2 з файлом всередині, заархівуй, видали оригінал і розпакуй архів назад.`,
      hint: `mkdir ${name}-dir2 && touch ${name}-dir2/f.txt && tar -cf ${name}2.tar ${name}-dir2 && rm -rf ${name}-dir2 && tar -xf ${name}2.tar`,
      solution: `mkdir ${name}-dir2 && touch ${name}-dir2/f.txt && tar -cf ${name}2.tar ${name}-dir2 && rm -rf ${name}-dir2 && tar -xf ${name}2.tar`,
      xp: 30,
      check: (ctx) => h.isFile(ctx.fs, `/home/student/${name}-dir2/f.txt`),
    });
  });

  NAMES.slice(0, 3).forEach((name, i) => {
    drills.push({
      id: `p-arch-gzip-${i}`,
      difficulty: 2,
      prompt: `Створи файл ${name}.log з текстом "log data" і стисни його через gzip (з опцією -k, щоб зберегти оригінал).`,
      hint: `echo "log data" > ${name}.log && gzip -k ${name}.log`,
      solution: `echo "log data" > ${name}.log && gzip -k ${name}.log`,
      xp: 20,
      check: (ctx) => h.isFile(ctx.fs, `/home/student/${name}.log.gz`) && h.isFile(ctx.fs, `/home/student/${name}.log`),
    });
    drills.push({
      id: `p-arch-zip-${i}`,
      difficulty: 2,
      prompt: `Створи директорію ${name}-zip з файлом всередині і заархівуй її в ${name}.zip.`,
      hint: `mkdir ${name}-zip && touch ${name}-zip/f.txt && zip -r ${name}.zip ${name}-zip`,
      solution: `mkdir ${name}-zip && touch ${name}-zip/f.txt && zip -r ${name}.zip ${name}-zip`,
      xp: 20,
      check: (ctx) => h.isFile(ctx.fs, `/home/student/${name}.zip`),
    });
  });

  return drills;
}

module.exports = { build };
