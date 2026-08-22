'use strict';
const h = require('./helpers');

module.exports = {
  id: 'permissions',
  title: 'Права доступу',
  icon: '🔐',
  description: 'chmod, chown — керування правами та власниками файлів.',
  drills: [
    {
      id: 'perm-1',
      prompt: 'Створи файл deploy_key і зроби його доступним для читання й запису тільки власнику (числовий режим 600).',
      hint: 'chmod 600 <файл> — читання/запис для власника, нічого для інших.',
      solution: 'touch deploy_key && chmod 600 deploy_key',
      xp: 15,
      check: (ctx) => h.modeIs(ctx.fs, '/home/student/deploy_key', 0o600),
    },
    {
      id: 'perm-2',
      prompt: 'Зроби файл projects/webapp/deploy.sh виконуваним для всіх (числовий режим 755).',
      hint: 'chmod 755 <файл> — rwx власнику, rx групі та іншим.',
      solution: 'chmod 755 projects/webapp/deploy.sh',
      xp: 15,
      check: (ctx) => h.modeIs(ctx.fs, '/home/student/projects/webapp/deploy.sh', 0o755),
    },
    {
      id: 'perm-3',
      prompt: 'Створи файл secret.txt і забери всі права доступу навіть у власника (0000).',
      hint: 'chmod 000 <файл> прибирає всі права.',
      solution: 'touch secret.txt && chmod 000 secret.txt',
      xp: 15,
      check: (ctx) => h.modeIs(ctx.fs, '/home/student/secret.txt', 0),
    },
    {
      id: 'perm-4',
      prompt: 'Створи файл run.sh і додай власнику право на виконання, використавши символьний режим (не змінюючи інші права).',
      hint: 'chmod u+x <файл> додає право виконання лише власнику.',
      solution: 'touch run.sh && chmod u+x run.sh',
      xp: 20,
      check: (ctx) => {
        const n = ctx.fs.getNode('/home/student/run.sh');
        return !!n && (n.mode & 0o100) !== 0;
      },
    },
    {
      id: 'perm-5',
      prompt: 'Забери право на запис для групи і для інших у файлі documents/report.csv, залишивши права власника без змін.',
      hint: 'chmod go-w <файл>',
      solution: 'chmod go-w documents/report.csv',
      xp: 20,
      check: (ctx) => {
        const n = ctx.fs.getNode('/home/student/documents/report.csv');
        return !!n && (n.mode & 0o022) === 0;
      },
    },
    {
      id: 'perm-6',
      prompt: 'Зміни власника файлу documents/notes.txt на root.',
      hint: 'chown <новий_власник> <файл>',
      solution: 'chown root documents/notes.txt',
      xp: 15,
      check: (ctx) => h.ownerIs(ctx.fs, '/home/student/documents/notes.txt', 'root'),
    },
    {
      id: 'perm-7',
      prompt: 'Подивись на права доступу файлів у поточній директорії у форматі "довгого" списку та знайди рядок з deploy_key.',
      hint: 'ls -l | grep deploy_key',
      solution: 'ls -l | grep deploy_key',
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'deploy_key') && /^-rw-------/m.test(ctx.result.stdout),
    },
  ],
};
