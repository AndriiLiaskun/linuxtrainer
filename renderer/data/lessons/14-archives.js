'use strict';
const h = require('./helpers');

module.exports = {
  id: 'archives',
  title: 'Архівування',
  icon: '🗜️',
  description: 'tar, gzip, zip — пакування та стиснення файлів.',
  practice: require('./practice/archives').build(),
  drills: [
    {
      id: 'arch-1',
      difficulty: 2,
      prompt: 'Створи tar-архів backup.tar із вмістом директорії documents.',
      hint: 'tar -cf <архів>.tar <джерело>',
      solution: 'tar -cf backup.tar documents',
      xp: 20,
      check: (ctx) => h.isFile(ctx.fs, '/home/student/backup.tar'),
    },
    {
      id: 'arch-2',
      difficulty: 1,
      prompt: 'Перевір вміст архіву backup.tar, не розпаковуючи його.',
      hint: 'tar -tf <архів>.tar',
      solution: 'tar -tf backup.tar',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'documents'),
    },
    {
      id: 'arch-3',
      difficulty: 2,
      prompt: 'Розпакуй архів backup.tar у поточній директорії.',
      hint: 'tar -xf <архів>.tar',
      solution: 'tar -xf backup.tar',
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result),
    },
    {
      id: 'arch-4',
      difficulty: 2,
      prompt: 'Стисни файл documents/notes.txt за допомогою gzip (залишивши оригінал завдяки -k).',
      hint: 'gzip -k <файл>',
      solution: 'gzip -k documents/notes.txt',
      xp: 20,
      check: (ctx) => h.isFile(ctx.fs, '/home/student/documents/notes.txt.gz') && h.isFile(ctx.fs, '/home/student/documents/notes.txt'),
    },
    {
      id: 'arch-5',
      difficulty: 2,
      prompt: 'Створи zip-архів archive.zip із директорії documents.',
      hint: 'zip -r <архів>.zip <джерело>',
      solution: 'zip -r archive.zip documents',
      xp: 20,
      check: (ctx) => h.isFile(ctx.fs, '/home/student/archive.zip'),
    },
  ],
};
