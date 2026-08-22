'use strict';

const CASES = [
  { desc: 'щодня о 3:30 ночі', expr: '30 3 * * *', diff: 1 },
  { desc: 'щогодини, у нульову хвилину', expr: '0 * * * *', diff: 1 },
  { desc: 'щопонеділка о 9:00', expr: '0 9 * * 1', diff: 2 },
  { desc: 'щодня опівночі (00:00)', expr: '0 0 * * *', diff: 1 },
  { desc: 'щодня о 18:45', expr: '45 18 * * *', diff: 2 },
  { desc: 'щоп’ятниці о 17:00', expr: '0 17 * * 5', diff: 2 },
  { desc: 'кожні 15 хвилин', expr: '*/15 * * * *', diff: 3 },
  { desc: '1-го числа кожного місяця о 2:00', expr: '0 2 1 * *', diff: 3 },
  { desc: 'щонеділі опівночі', expr: '0 0 * * 0', diff: 2 },
  { desc: 'щодня о 6:15 ранку', expr: '15 6 * * *', diff: 1 },
  { desc: 'кожні 30 хвилин', expr: '*/30 * * * *', diff: 3 },
  { desc: 'щосереди о 12:00 (обід)', expr: '0 12 * * 3', diff: 2 },
  { desc: 'щодня о 23:59', expr: '59 23 * * *', diff: 1 },
  { desc: 'щороку 1 січня опівночі', expr: '0 0 1 1 *', diff: 3 },
  { desc: 'щобудня (пн-пт) о 8:00', expr: '0 8 * * 1-5', diff: 3 },
];

function build() {
  return CASES.map((c, i) => ({
    id: `p-cron-${i}`,
    difficulty: c.diff,
    quiz: true,
    prompt: `Питання: який cron-вираз означає "${c.desc}"? Введи як 5 полів через пробіл.`,
    hint: 'Формат: хвилина година день_місяця місяць день_тижня (0=неділя).',
    solution: c.expr,
    xp: 15 + c.diff * 5,
    check: (ctx) => ctx.input.trim() === c.expr,
  }));
}

module.exports = { build };
