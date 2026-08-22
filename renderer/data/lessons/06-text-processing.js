'use strict';
const h = require('./helpers');

module.exports = {
  id: 'text-processing',
  title: 'Обробка тексту',
  icon: '⚙️',
  description: 'sed, awk, sort, uniq, cut, tr — конвеєри обробки тексту.',
  drills: [
    {
      id: 'text-1',
      prompt: 'Виведи лише перше поле (ім\'я) з файлу documents/report.csv, використовуючи кому як роздільник.',
      hint: "cut -d',' -f1 <файл>",
      solution: "cut -d',' -f1 documents/report.csv",
      xp: 20,
      check: (ctx) => h.stdoutLines(ctx.result).join(',') === 'name,alice,bob,carol',
    },
    {
      id: 'text-2',
      prompt: 'Відсортуй рядки файлу documents/notes.txt за алфавітом.',
      hint: 'sort <файл>',
      solution: 'sort documents/notes.txt',
      xp: 15,
      check: (ctx) => h.stdoutLines(ctx.result)[0] === 'Buy coffee',
    },
    {
      id: 'text-3',
      prompt: 'Заміни слово "hello" на "hi" у виводі команди echo "hello devops" (через пайп у sed).',
      hint: "echo '...' | sed 's/hello/hi/'",
      solution: "echo 'hello devops' | sed 's/hello/hi/'",
      xp: 20,
      check: (ctx) => h.stdoutTrim(ctx.result) === 'hi devops',
    },
    {
      id: 'text-4',
      prompt: 'Використай awk, щоб вивести другий стовпець (бали) з documents/report.csv, роздільник — кома.',
      hint: "awk -F',' '{print $2}' <файл>",
      solution: "awk -F',' '{print $2}' documents/report.csv",
      xp: 25,
      check: (ctx) => h.stdoutLines(ctx.result).join(',') === 'score,91,74,88',
    },
    {
      id: 'text-5',
      prompt: 'Виведи усі рядки лог-файлу, відсортовані так, щоб унікальні рівні (INFO/WARN/ERROR) можна було порахувати: спочатку виріж друге "слово" кожного рядка логів awk-ом, а потім прибери повтори командою uniq (використай сортування перед uniq).',
      hint: "awk '{print $3}' <лог> | sort | uniq",
      solution: "awk '{print $3}' projects/webapp/logs/app.log | sort | uniq",
      xp: 30,
      check: (ctx) => {
        const lines = h.stdoutLines(ctx.result).sort();
        return lines.join(',') === 'ERROR,INFO,WARN';
      },
    },
    {
      id: 'text-6',
      prompt: 'Порахуй, скільки разів кожен рівень логування (INFO/WARN/ERROR) зустрічається у лозі — використай sort та uniq -c.',
      hint: "awk '{print $3}' <лог> | sort | uniq -c",
      solution: "awk '{print $3}' projects/webapp/logs/app.log | sort | uniq -c",
      xp: 25,
      check: (ctx) => h.stdoutIncludes(ctx.result, '3 INFO'),
    },
    {
      id: 'text-7',
      prompt: 'Переведи весь текст файлу documents/notes.txt у ВЕРХНІЙ регістр (через пайп у tr).',
      hint: "cat <файл> | tr 'a-z' 'A-Z'",
      solution: "cat documents/notes.txt | tr 'a-z' 'A-Z'",
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'TODO') && h.stdoutIncludes(ctx.result, 'BUY COFFEE'),
    },
  ],
};
