'use strict';
const h = require('./helpers');

module.exports = {
  id: 'search',
  title: 'Пошук і фільтрація',
  icon: '🔍',
  description: 'grep, find — пошук тексту та файлів.',
  drills: [
    {
      id: 'search-1',
      prompt: 'Знайди рядки зі словом ERROR у файлі projects/webapp/logs/app.log.',
      hint: 'grep <шаблон> <файл>',
      solution: 'grep ERROR projects/webapp/logs/app.log',
      xp: 15,
      check: (ctx) => h.stdoutLines(ctx.result).length === 2 && h.stdoutIncludes(ctx.result, 'Failed to connect'),
    },
    {
      id: 'search-2',
      prompt: 'Знайди рядки зі словом "error" у лозі без урахування регістру (великі/малі літери).',
      hint: 'Прапорець -i вимикає чутливість до регістру.',
      solution: 'grep -i error projects/webapp/logs/app.log',
      xp: 15,
      check: (ctx) => h.stdoutLines(ctx.result).length === 2,
    },
    {
      id: 'search-3',
      prompt: 'Порахуй, скільки рядків у лозі НЕ містять слова INFO (інверсія пошуку).',
      hint: 'Прапорець -v інвертує збіг; скомбінуй із wc -l через пайп.',
      solution: 'grep -v INFO projects/webapp/logs/app.log | wc -l',
      xp: 20,
      check: (ctx) => h.stdoutTrim(ctx.result).split(/\s+/)[0] === '3',
    },
    {
      id: 'search-4',
      prompt: 'Виведи рядки зі словом ERROR разом із номерами рядків у файлі.',
      hint: 'Прапорець -n показує номер рядка.',
      solution: 'grep -n ERROR projects/webapp/logs/app.log',
      xp: 15,
      check: (ctx) => /^\d+:/m.test(ctx.result.stdout),
    },
    {
      id: 'search-5',
      prompt: 'Знайди усі файли з розширенням .py у директорії projects.',
      hint: "find <директорія> -name '*.py'",
      solution: "find projects -name '*.py'",
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'app.py') && !h.stdoutIncludes(ctx.result, '.log'),
    },
    {
      id: 'search-6',
      prompt: 'Знайди усі директорії (не файли) всередині projects.',
      hint: 'find <шлях> -type d',
      solution: 'find projects -type d',
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'src') && h.stdoutIncludes(ctx.result, 'logs'),
    },
    {
      id: 'search-7',
      prompt: 'Просто підрахуй кількість рядків зі словом WARN у лозі (виведи лише число).',
      hint: 'grep -c рахує кількість рядків-збігів.',
      solution: 'grep -c WARN projects/webapp/logs/app.log',
      xp: 15,
      check: (ctx) => h.stdoutTrim(ctx.result) === '1',
    },
  ],
};
