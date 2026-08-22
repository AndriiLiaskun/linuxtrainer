'use strict';
const h = require('../helpers');

const INV = 'documents/inventory.csv';
// id,item,qty,price
const INV_COLS = [
  { f: 1, name: 'id', values: ['id', '1', '2', '3', '4', '5'] },
  { f: 2, name: 'item', values: ['item', 'keyboard', 'monitor', 'mouse', 'webcam', 'headset'] },
  { f: 3, name: 'qty', values: ['qty', '12', '4', '30', '8', '17'] },
  { f: 4, name: 'price', values: ['price', '25', '180', '15', '40', '35'] },
];

function build() {
  const drills = [];

  INV_COLS.forEach((c, i) => {
    drills.push({
      id: `p-text-cut-${i}`,
      difficulty: 2,
      prompt: `Виріж стовпець "${c.name}" (поле ${c.f}) з файлу ${INV}, роздільник — кома.`,
      hint: `cut -d',' -f${c.f} ${INV}`,
      solution: `cut -d',' -f${c.f} ${INV}`,
      xp: 20,
      check: (ctx) => h.stdoutLines(ctx.result).join(',') === c.values.join(','),
    });
    drills.push({
      id: `p-text-awk-${i}`,
      difficulty: 3,
      prompt: `Через awk виведи стовпець "${c.name}" (поле $${c.f}) з файлу ${INV}, роздільник — кома.`,
      hint: `awk -F',' '{print $${c.f}}' ${INV}`,
      solution: `awk -F',' '{print $${c.f}}' ${INV}`,
      xp: 25,
      check: (ctx) => h.stdoutLines(ctx.result).join(',') === c.values.join(','),
    });
  });

  drills.push({
    id: 'p-text-sort-servers',
    difficulty: 1,
    prompt: 'Відсортуй за алфавітом рядки файлу documents/servers.txt.',
    hint: 'sort documents/servers.txt',
    solution: 'sort documents/servers.txt',
    xp: 15,
    check: (ctx) => h.stdoutLines(ctx.result)[0] === 'cache-01',
  });
  drills.push({
    id: 'p-text-sort-rev-servers',
    difficulty: 2,
    prompt: 'Відсортуй рядки файлу documents/servers.txt у зворотному алфавітному порядку.',
    hint: 'sort -r documents/servers.txt',
    solution: 'sort -r documents/servers.txt',
    xp: 20,
    check: (ctx) => h.stdoutLines(ctx.result)[0] === 'web-02',
  });
  drills.push({
    id: 'p-text-sort-num-qty',
    difficulty: 3,
    prompt: `Виріж стовпець qty з ${INV} (без заголовка) і відсортуй числа за зростанням.`,
    hint: `tail -n +2 ${INV} | cut -d',' -f3 | sort -n`,
    solution: `tail -n +2 ${INV} | cut -d',' -f3 | sort -n`,
    xp: 30,
    check: (ctx) => h.stdoutLines(ctx.result).join(',') === '4,8,12,17,30',
  });

  const SED_WORDS = [
    { from: 'hello', to: 'hi', input: 'hello world' },
    { from: 'foo', to: 'bar', input: 'foo baz foo' },
    { from: 'error', to: 'warning', input: 'error in module' },
  ];
  SED_WORDS.forEach((w, i) => {
    drills.push({
      id: `p-text-sed-${i}`,
      difficulty: 2,
      prompt: `Заміни перше входження слова "${w.from}" на "${w.to}" у виводі: echo "${w.input}" (через пайп у sed).`,
      hint: `echo "${w.input}" | sed 's/${w.from}/${w.to}/'`,
      solution: `echo "${w.input}" | sed 's/${w.from}/${w.to}/'`,
      xp: 20,
      check: (ctx) => h.stdoutTrim(ctx.result) === w.input.replace(w.from, w.to),
    });
    drills.push({
      id: `p-text-sed-g-${i}`,
      difficulty: 3,
      prompt: `Заміни УСІ входження слова "${w.from}" на "${w.to}" у виводі: echo "${w.input}" (глобальна заміна, флаг g).`,
      hint: `echo "${w.input}" | sed 's/${w.from}/${w.to}/g'`,
      solution: `echo "${w.input}" | sed 's/${w.from}/${w.to}/g'`,
      xp: 25,
      check: (ctx) => h.stdoutTrim(ctx.result) === w.input.split(w.from).join(w.to),
    });
  });

  drills.push({
    id: 'p-text-tr-upper',
    difficulty: 2,
    prompt: 'Переведи вміст файлу documents/servers.txt у верхній регістр (через пайп у tr).',
    hint: "cat documents/servers.txt | tr 'a-z' 'A-Z'",
    solution: "cat documents/servers.txt | tr 'a-z' 'A-Z'",
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'WEB-01'),
  });
  drills.push({
    id: 'p-text-tr-delete-digits',
    difficulty: 3,
    prompt: 'Видали усі цифри з виводу: echo "server123log456" (через tr -d).',
    hint: "echo 'server123log456' | tr -d '0-9'",
    solution: "echo 'server123log456' | tr -d '0-9'",
    xp: 25,
    check: (ctx) => h.stdoutTrim(ctx.result) === 'serverlog',
  });

  drills.push({
    id: 'p-text-uniq-count',
    difficulty: 3,
    prompt: 'Виріж перші букви кожного рядка documents/servers.txt (поле 1 за роздільником "-"), відсортуй і порахуй унікальні через uniq -c.',
    hint: "cut -d'-' -f1 documents/servers.txt | sort | uniq -c",
    solution: "cut -d'-' -f1 documents/servers.txt | sort | uniq -c",
    xp: 30,
    check: (ctx) => h.stdoutIncludes(ctx.result, '2 web'),
  });

  // cut with multiple fields at once (comma-separated).
  drills.push({
    id: 'p-text-cut-multi',
    difficulty: 3,
    prompt: `Виріж одразу поля item та price (2 і 4) з ${INV}, роздільник — кома.`,
    hint: `cut -d',' -f2,4 ${INV}`,
    solution: `cut -d',' -f2,4 ${INV}`,
    xp: 30,
    check: (ctx) => h.stdoutLines(ctx.result)[1] === 'keyboard,25',
  });

  // awk printing two fields joined by a literal separator.
  drills.push({
    id: 'p-text-awk-multi',
    difficulty: 3,
    prompt: `Через awk виведи "item: <назва> — <ціна>" для кожного товару в ${INV} (без заголовка достатньо просто вивести всі рядки).`,
    hint: `awk -F',' '{print $2, $4}' ${INV}`,
    solution: `awk -F',' '{print $2, $4}' ${INV}`,
    xp: 30,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'keyboard 25'),
  });

  // sort -u — dedupe while sorting in one step.
  drills.push({
    id: 'p-text-sort-u',
    difficulty: 2,
    prompt: 'Виведи унікальні перші літери серверів (до дефіса) з documents/servers.txt, відсортовані, без повторів (sort -u).',
    hint: "cut -d'-' -f1 documents/servers.txt | sort -u",
    solution: "cut -d'-' -f1 documents/servers.txt | sort -u",
    xp: 25,
    check: (ctx) => h.stdoutLines(ctx.result).length === 4,
  });

  // sed with numeric patterns.
  const SED_NUM = [
    { input: 'server had 3 errors', from: '3', to: '5' },
    { input: 'port 8080 is open', from: '8080', to: '9090' },
  ];
  SED_NUM.forEach((s, i) => {
    drills.push({
      id: `p-text-sed-num-${i}`,
      difficulty: 2,
      prompt: `Заміни "${s.from}" на "${s.to}" у виводі: echo "${s.input}".`,
      hint: `echo "${s.input}" | sed 's/${s.from}/${s.to}/'`,
      solution: `echo "${s.input}" | sed 's/${s.from}/${s.to}/'`,
      xp: 20,
      check: (ctx) => h.stdoutTrim(ctx.result) === s.input.replace(s.from, s.to),
    });
  });

  // sed with a real regex pattern (not just a literal word) — a character
  // class + quantifier that matches ANY run of digits, whatever they are.
  const SED_REGEX = [
    { input: 'order-2024-item-15', pattern: '[0-9]+', repl: '#', expect: 'order-#-item-#' },
    { input: 'user_442 logged in', pattern: '[0-9]+', repl: 'N', expect: 'user_N logged in' },
  ];
  SED_REGEX.forEach((s, i) => {
    drills.push({
      id: `p-text-sed-regex-${i}`,
      difficulty: 3,
      prompt: `У виводі echo "${s.input}" заміни КОЖНУ послідовність цифр на "${s.repl}", використавши регулярний вираз (клас символів [0-9] і квантифікатор +), а не конкретне число.`,
      hint: `echo "${s.input}" | sed 's/${s.pattern}/${s.repl}/g'`,
      solution: `echo "${s.input}" | sed 's/${s.pattern}/${s.repl}/g'`,
      xp: 30,
      check: (ctx) => h.stdoutTrim(ctx.result) === s.expect,
    });
  });

  // tr -s (squeeze repeated characters — useful for messy whitespace/logs).
  drills.push({
    id: 'p-text-tr-squeeze',
    difficulty: 3,
    prompt: 'Стисни повторювані пробіли в один пробіл у виводі: echo "a   b    c" (tr -s).',
    hint: "echo 'a   b    c' | tr -s ' '",
    solution: "echo 'a   b    c' | tr -s ' '",
    xp: 25,
    check: (ctx) => h.stdoutTrim(ctx.result) === 'a b c',
  });

  // diff — compare two files line by line.
  drills.push({
    id: 'p-text-diff-same',
    difficulty: 2,
    prompt: 'Створи два однакові файли a.txt і b.txt (echo "same" в обидва), і порівняй їх командою diff — переконайся, що різниці немає.',
    hint: 'echo same > a.txt && echo same > b.txt && diff a.txt b.txt',
    solution: 'echo same > a.txt && echo same > b.txt && diff a.txt b.txt',
    xp: 25,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutTrim(ctx.result) === '',
  });
  drills.push({
    id: 'p-text-diff-different',
    difficulty: 2,
    prompt: 'Створи два РІЗНІ файли a.txt ("one") і b.txt ("two"), і порівняй їх командою diff — переконайся, що різниця показана.',
    hint: 'echo one > a.txt && echo two > b.txt && diff a.txt b.txt',
    solution: 'echo one > a.txt && echo two > b.txt && diff a.txt b.txt',
    xp: 25,
    check: (ctx) => ctx.result.code !== 0 && h.stdoutIncludes(ctx.result, 'one') && h.stdoutIncludes(ctx.result, 'two'),
  });

  return drills;
}

module.exports = { build };
