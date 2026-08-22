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

## Реліз нової версії (авто-оновлення)

Застосунок перевіряє оновлення через GitHub Releases репозиторію
[AndriiLiaskun/linuxtrainer](https://github.com/AndriiLiaskun/linuxtrainer)
(бібліотека `electron-updater`). Щоб випустити нову версію після змін:

1. Підніми версію в `package.json` (напр. `1.0.1` → `1.0.2`).
2. Опублікуй реліз (потрібен GitHub-токен з правом `repo`):

   ```bash
   GH_TOKEN=$(gh auth token) npm run release
   ```

3. **Відомий глюк electron-builder**: іноді він створює ДВА чернеткових
   релізи з однаковим тегом замість одного (гонитва при завантаженні
   `latest.yml` і `.exe` паралельно). Перевір:

   ```bash
   gh release list --repo AndriiLiaskun/linuxtrainer
   ```

   Якщо бачиш два `Draft` з однаковою версією — подивись, у якого з них
   є всі 3 файли (`latest.yml`, `...exe`, `...exe.blockmap`), видали
   інший (`gh api -X DELETE repos/.../releases/<id>`), доклади файл,
   якого бракує (`gh release upload <tag> <file>`), і опублікуй:

   ```bash
   gh release edit v1.0.2 --repo AndriiLiaskun/linuxtrainer --draft=false --latest
   ```

Після цього всі встановлені копії застосунку самі знайдуть і
завантажать оновлення протягом кількох секунд після запуску (або одразу
за кнопкою «Перевірити оновлення» внизу бічної панелі), і покажуть
банер «Перезапустити й встановити».

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
