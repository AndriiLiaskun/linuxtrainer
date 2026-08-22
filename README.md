# LinuxTrainer

Десктопний тренажер термінала для DevOps-практики (Electron), у стилі Terminal Drill:
дрили по одному завданню за раз, миттєва перевірка команд у справжньому
емульованому bash-шеллі, XP/рівні/серії/бейджі.

## Запуск

```bash
npm install
npm start
```

## Тести (движок шелла + перевірка контенту всіх дрилів)

```bash
npm test
```

## Збірка встановлювача для Windows

```bash
npm run dist
```

## Структура

- `renderer/shell/` — віртуальна файлова система та bash-подібний шелл
  (парсер, пайпи, редіректи, змінні, `for`/`if`, ~50 команд: файлові,
  текстові, `systemctl`, `git`, `docker`, `apt`, мережеві, архіви).
- `renderer/data/lessons/` — 15 уроків, 111 дрилів (навігація → файли →
  права → пошук/текст → скрипти → процеси → systemd → мережа → пакети →
  git → docker → архіви → cron).
- `renderer/progress.js` — XP/рівні/серії/бейджі, збереження прогресу.
- `main.js` — Electron main-процес, зберігає прогрес у
  `%APPDATA%/linuxtrainer/progress.json`.

## Додати новий дрил

Відкрий відповідний файл у `renderer/data/lessons/`, додай об'єкт у масив
`drills`: `{ id, prompt, hint, solution, xp, check(ctx) }`, де `check`
отримує `{ shell, fs, state, result, input }` і повертає true/false.
Після зміни запусти `npm test` — він виконає `solution` кожного дрилу і
перевірить, що `check()` дійсно проходить.
