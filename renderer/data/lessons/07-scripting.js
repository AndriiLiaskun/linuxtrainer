'use strict';
const h = require('./helpers');

module.exports = {
  id: 'scripting',
  title: 'Змінні та bash-скрипти',
  icon: '📜',
  description: 'Змінні, export, підстановка команд, цикли та умови.',
  drills: [
    {
      id: 'script-1',
      prompt: 'Створи змінну оточення APP_ENV зі значенням production і виведи її значення.',
      hint: 'VAR=значення, потім echo $VAR',
      solution: 'APP_ENV=production && echo $APP_ENV',
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result) === 'production',
    },
    {
      id: 'script-2',
      prompt: 'Виведи значення змінної APP_ENV всередині подвійних лапок разом із текстом "Env: ".',
      hint: 'Подвійні лапки дозволяють підстановку змінних: "Env: $APP_ENV"',
      solution: 'echo "Env: $APP_ENV"',
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result) === 'Env: production',
    },
    {
      id: 'script-3',
      prompt: 'Переконайся, що одинарні лапки НЕ підставляють значення змінної — виведи буквально $APP_ENV.',
      hint: "У одинарних лапках $ не інтерпретується: echo '$APP_ENV'",
      solution: "echo '$APP_ENV'",
      xp: 20,
      check: (ctx) => h.stdoutTrim(ctx.result) === '$APP_ENV',
    },
    {
      id: 'script-4',
      prompt: 'Використай підстановку команди $(...), щоб вивести поточну робочу директорію разом із текстом "CWD: ".',
      hint: 'echo "CWD: $(pwd)"',
      solution: 'echo "CWD: $(pwd)"',
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result) === 'CWD: /home/student',
    },
    {
      id: 'script-5',
      prompt: 'Експортуй змінну DEBUG зі значенням 1, щоб вона була доступна дочірнім процесам.',
      hint: 'export VAR=значення',
      solution: 'export DEBUG=1',
      xp: 15,
      check: (ctx) => ctx.fs.env.DEBUG === '1',
    },
    {
      id: 'script-6',
      prompt: 'Напиши цикл for, який виводить числа 1, 2 та 3, кожне на своєму рядку.',
      hint: 'for i in 1 2 3; do echo $i; done',
      solution: 'for i in 1 2 3; do echo $i; done',
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result) === '1\n2\n3',
    },
    {
      id: 'script-7',
      prompt: 'Напиши цикл for, який створює три файли: srv1.log, srv2.log, srv3.log.',
      hint: 'for n in 1 2 3; do touch srv$n.log; done',
      solution: 'for n in 1 2 3; do touch srv$n.log; done',
      xp: 30,
      check: (ctx) =>
        h.isFile(ctx.fs, '/home/student/srv1.log') &&
        h.isFile(ctx.fs, '/home/student/srv2.log') &&
        h.isFile(ctx.fs, '/home/student/srv3.log'),
    },
    {
      id: 'script-8',
      prompt: 'Використай умову if, щоб вивести "exists", якщо файл documents/notes.txt існує, інакше "missing".',
      hint: 'if [ -f шлях ]; then echo exists; else echo missing; fi',
      solution: 'if [ -f documents/notes.txt ]; then echo exists; else echo missing; fi',
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result) === 'exists',
    },
    {
      id: 'script-9',
      prompt: 'Перевір код завершення (exit code) команди, яка точно провалиться — спробуй перейти в неіснуючу директорію /no-such-dir, а потім виведи $?.',
      hint: 'Після невдалої команди $? міститиме ненульовий код.',
      solution: 'cd /no-such-dir; echo $?',
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result) !== '0',
    },
  ],
};
