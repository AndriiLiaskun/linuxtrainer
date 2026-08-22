'use strict';
const h = require('./helpers');

module.exports = {
  id: 'cron',
  title: 'Планування завдань (cron)',
  icon: '⏰',
  description: 'crontab — розклад для регулярних задач.',
  drills: [
    {
      id: 'cron-1',
      prompt: 'Переглянь поточний список завдань cron поточного користувача (список порожній — це нормально).',
      hint: 'crontab -l',
      solution: 'crontab -l',
      xp: 15,
      check: (ctx) => h.succeeded(ctx.result),
    },
    {
      id: 'cron-quiz-1',
      prompt: 'Питання: який cron-вираз означає "щодня о 3:30 ночі"? Введи відповідь як cron-вираз (5 полів через пробіл).',
      hint: 'Формат: хвилина година день місяць день_тижня',
      solution: '30 3 * * *',
      xp: 20,
      quiz: true,
      check: (ctx) => ctx.input.trim() === '30 3 * * *',
    },
    {
      id: 'cron-quiz-2',
      prompt: 'Питання: який cron-вираз означає "щогодини, у нульову хвилину"?',
      hint: 'Хвилина фіксована (0), решта полів — зірочки.',
      solution: '0 * * * *',
      xp: 20,
      quiz: true,
      check: (ctx) => ctx.input.trim() === '0 * * * *',
    },
    {
      id: 'cron-quiz-3',
      prompt: 'Питання: який cron-вираз запускає завдання щопонеділка о 9:00?',
      hint: 'День тижня: 0=неділя, 1=понеділок, ... 6=субота.',
      solution: '0 9 * * 1',
      xp: 25,
      quiz: true,
      check: (ctx) => ctx.input.trim() === '0 9 * * 1',
    },
  ],
};
