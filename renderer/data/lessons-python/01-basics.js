'use strict';

// Python-track drills run through pythonWorker.js (real Pyodide execution,
// see project memory / pythonWorker.js comments), NOT the bash Shell.
// check(ctx) receives ctx = { result: { ok, stdout, stderr, error, globals },
// input: <submitted code> } — `globals` holds every user-defined variable
// left over after the script ran (functions/modules are not capturable and
// are always omitted, see pythonWorker.js's toPlainJs()).

module.exports = {
  id: 'py-basics',
  track: 'python',
  title: 'Основи Python для скриптів',
  icon: '🐍',
  description: 'Змінні, умови, цикли, функції — рівно стільки, щоб писати DevOps-скрипти.',
  drills: [
    {
      id: 'py-basics-1',
      difficulty: 1,
      prompt: 'Виведи рядок "Hello, DevOps!" за допомогою print().',
      hint: 'print("Hello, DevOps!")',
      solution: 'print("Hello, DevOps!")',
      xp: 10,
      check: (ctx) => ctx.result.ok && ctx.result.stdout.trim() === 'Hello, DevOps!',
    },
    {
      id: 'py-basics-2',
      difficulty: 1,
      prompt: 'Створи змінну server_name зі значенням "web-01" і виведи її через f-string у форматі "Server: web-01".',
      hint: 'server_name = "web-01"\nprint(f"Server: {server_name}")',
      solution: 'server_name = "web-01"\nprint(f"Server: {server_name}")',
      xp: 15,
      check: (ctx) => ctx.result.ok && ctx.result.stdout.trim() === 'Server: web-01' && ctx.result.globals.server_name === 'web-01',
    },
    {
      id: 'py-basics-3',
      difficulty: 2,
      prompt: 'Створи список servers із трьома рядками: "web-01", "web-02", "db-01". Виведи кожен сервер на своєму рядку через цикл for.',
      hint: 'servers = ["web-01", "web-02", "db-01"]\nfor s in servers:\n    print(s)',
      solution: 'servers = ["web-01", "web-02", "db-01"]\nfor s in servers:\n    print(s)',
      xp: 20,
      check: (ctx) =>
        ctx.result.ok &&
        ctx.result.stdout.trim() === 'web-01\nweb-02\ndb-01' &&
        Array.isArray(ctx.result.globals.servers) &&
        ctx.result.globals.servers.length === 3,
    },
    {
      id: 'py-basics-4',
      difficulty: 2,
      prompt: 'Напиши функцію is_prod(env), яка повертає True, якщо env дорівнює "production", інакше False. Виклич її для "production" і збережи результат у змінну result.',
      hint: 'def is_prod(env):\n    return env == "production"\n\nresult = is_prod("production")',
      solution: 'def is_prod(env):\n    return env == "production"\n\nresult = is_prod("production")',
      xp: 25,
      check: (ctx) => ctx.result.ok && ctx.result.globals.result === true,
    },
    {
      id: 'py-basics-5',
      difficulty: 2,
      prompt: 'Дано список кодів відповіді status_codes = [200, 404, 200, 500, 200, 301]. Порахуй, скільки серед них рівно 200, і збережи кількість у змінну ok_count.',
      hint: 'status_codes = [200, 404, 200, 500, 200, 301]\nok_count = 0\nfor code in status_codes:\n    if code == 200:\n        ok_count += 1',
      solution: 'status_codes = [200, 404, 200, 500, 200, 301]\nok_count = 0\nfor code in status_codes:\n    if code == 200:\n        ok_count += 1',
      xp: 25,
      check: (ctx) => ctx.result.ok && ctx.result.globals.ok_count === 3,
    },
    {
      id: 'py-basics-6',
      difficulty: 3,
      prompt: 'Спробуй поділити 10 на 0 всередині try/except, і замість падіння скрипту збережи текст помилки у змінну error_message (наприклад через str(e)).',
      hint: 'try:\n    10 / 0\nexcept ZeroDivisionError as e:\n    error_message = str(e)',
      solution: 'try:\n    10 / 0\nexcept ZeroDivisionError as e:\n    error_message = str(e)',
      xp: 30,
      check: (ctx) => ctx.result.ok && typeof ctx.result.globals.error_message === 'string' && ctx.result.globals.error_message.length > 0,
    },
    {
      id: 'py-basics-7',
      difficulty: 3,
      prompt:
        'Це справжній Python — subprocess.run() тут реально виконує команду у тій самій віртуальній файловій системі, що й bash-уроки. Виклич subprocess.run(["pwd"], capture_output=True, text=True) і збережи його stdout у змінну cwd_output.',
      hint: 'import subprocess\nresult = subprocess.run(["pwd"], capture_output=True, text=True)\ncwd_output = result.stdout',
      solution: 'import subprocess\nresult = subprocess.run(["pwd"], capture_output=True, text=True)\ncwd_output = result.stdout',
      xp: 35,
      check: (ctx) => ctx.result.ok && typeof ctx.result.globals.cwd_output === 'string' && ctx.result.globals.cwd_output.includes('/home/student'),
    },
  ],
};
