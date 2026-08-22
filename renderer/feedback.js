// Gentle, non-revealing guidance shown after a command that doesn't solve
// the current drill. Never suggests the actual answer — only nudges
// toward the category of mistake, mirroring what a human mentor would say
// before pointing at the solution.
'use strict';

const ERROR_HINTS = [
  [/No such file or directory/, 'Перевір, чи правильно вказаний шлях або назва файлу/директорії — можливо, десь одруківка.'],
  [/command not found/, 'Такої команди не існує. Перевір назву команди — можливо, помилка в написанні.'],
  [/Is a directory/, 'Це директорія, а не файл — цій команді потрібен саме файл (або додай прапорець для роботи з директоріями).'],
  [/Not a directory/, 'Це файл, а не директорія.'],
  [/[Pp]ermission/, 'Схоже, тут питання прав доступу — подумай про chmod/chown.'],
  [/missing (operand|pattern|file|command)/, 'Команді бракує аргументу — перевір, чи вказав усе, що потрібно.'],
  [/invalid (mode|pattern|reference)/, 'Перевір синтаксис аргументу — щось не так із форматом.'],
  [/Directory not empty/, 'Директорія не порожня — можливо, потрібен інший прапорець.'],
  [/not a git repository/, 'Тут ще немає git-репозиторію — можливо, спочатку потрібна інша команда.'],
  [/No such process/, 'Такого процесу не існує — перевір PID, наприклад через ps.'],
  [/NotFound/, 'Такого ресурсу не знайдено в кластері — перевір назву, наприклад через kubectl get.'],
  [/Unable to locate package/, 'Такого пакета немає в репозиторії — перевір назву.'],
  [/File exists/, 'Це вже існує — можливо, ця дія не потрібна ще раз.'],
  [/unknown (command|action)/, 'Такої підкоманди не існує — перевір, що йде одразу після назви програми.'],
];

function classifyError(stderr) {
  for (const [re, hint] of ERROR_HINTS) {
    if (re.test(stderr)) return hint;
  }
  return 'Команда повернула помилку — уважно прочитай повідомлення вище.';
}

// attempt: 1-indexed count of failed (non-passing) tries on this drill
// since it was last shown/reset.
function feedbackFor(result, attempt) {
  if (result && result.code !== 0 && result.stderr) {
    return { tone: 'error', text: classifyError(result.stderr) };
  }
  if (attempt <= 1) {
    return { tone: 'neutral', text: 'Команда виконалась, але це ще не розв’язує завдання. Спробуй інший підхід.' };
  }
  return { tone: 'neutral', text: 'Все ще не те. Натисни «💡 Підказка» знизу, якщо потрібна допомога.' };
}

function quizFeedbackFor(attempt) {
  if (attempt <= 1) return { tone: 'neutral', text: 'Не зовсім так — перевір формат відповіді.' };
  return { tone: 'neutral', text: 'Все ще не те. Спробуй «💡 Підказка».' };
}

module.exports = { classifyError, feedbackFor, quizFeedbackFor };
