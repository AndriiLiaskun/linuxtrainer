'use strict';
const h = require('../helpers');

// "Quest" drills: the prompt states a goal, not the literal commands.
// Reaching it requires combining several DIFFERENT commands (whoami/pwd,
// find, cd, cat/tail, grep, ls -l...) rather than one command with flags.
// All variants rely on the filesystem's default seeded tree
// (FileSystem._buildDefaultTree in renderer/shell/filesystem.js), since
// every practice drill runs against a fresh, independent Shell/FileSystem.

function build() {
  const drills = [];

  // Template A: find an unknown-location folder, go there, read a file.
  const FIND_DIR_TARGETS = [
    {
      dirName: 'k8s',
      file: 'api-deployment.yaml',
      needle: 'kind: Deployment',
      cwd: '/home/student/k8s',
    },
    {
      dirName: 'k8s',
      file: 'api-service.yaml',
      needle: 'kind: Service',
      cwd: '/home/student/k8s',
    },
    {
      dirName: 'webapp',
      file: 'README.md',
      needle: 'Sample project',
      cwd: '/home/student/projects/webapp',
    },
  ];
  FIND_DIR_TARGETS.forEach(({ dirName, file, needle, cwd }, i) => {
    drills.push({
      id: `p-quest-finddir-${i}`,
      difficulty: 3,
      prompt: `Тобі потрібно перевірити файл ${file}, але ти не пам'ятаєш, де саме лежить папка ${dirName}. Знайди її, перейди туди і виведи вміст файлу ${file}.`,
      hint: `find /home/student -type d -name ${dirName} && cd <знайдений шлях> && cat ${file}`,
      solution: `cd $(find /home/student -type d -name ${dirName}) && cat ${file}`,
      xp: 35,
      check: (ctx) => h.cwdIs(ctx.fs, cwd) && h.stdoutIncludes(ctx.result, needle),
    });
  });

  // Template B: identity + navigation + find-by-name + read (the "am I
  // root, which folder am I in, find the folder I need" pattern).
  drills.push({
    id: 'p-quest-identity-find-read',
    difficulty: 3,
    prompt: 'Спочатку перевір, під яким користувачем ти працюєш. Потім перевір поточну директорію. Десь у своїй домашній директорії є лог-файл app.log — знайди його, не знаючи точного шляху, і виведи останні 3 рядки.',
    hint: 'whoami && pwd && find /home/student -name app.log && tail -n 3 <знайдений шлях>',
    solution: 'whoami && pwd && tail -n 3 $(find /home/student -name app.log)',
    xp: 35,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'student') && h.stdoutIncludes(ctx.result, 'Recovered connection'),
  });
  drills.push({
    id: 'p-quest-identity-hostname',
    difficulty: 2,
    prompt: "Перевір своє ім'я користувача та ім'я хосту, а потім прочитай вітальне повідомлення системи (motd).",
    hint: 'whoami && hostname && cat /etc/motd',
    solution: 'whoami && hostname && cat /etc/motd',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'student') && h.stdoutIncludes(ctx.result, 'devops-trainer') && h.stdoutIncludes(ctx.result, 'Welcome'),
  });

  // Template C: navigate step by step into a nested folder and list it.
  const NAV_TARGETS = [
    { path: 'projects/webapp/src', file: 'app.py' },
    { path: 'projects/webapp/logs', file: 'app.log' },
    { path: 'documents', file: 'notes.txt' },
    { path: 'k8s', file: 'api-deployment.yaml' },
  ];
  NAV_TARGETS.forEach(({ path, file }, i) => {
    drills.push({
      id: `p-quest-nav-${i}`,
      difficulty: 2,
      prompt: `Перевір, у якій директорії ти зараз перебуваєш. Перейди в домашню директорію, а звідти — у ${path}, і подивись, які файли там лежать.`,
      hint: `pwd && cd ~ && cd ${path} && ls`,
      solution: `pwd && cd ~ && cd ${path} && ls`,
      xp: 25,
      check: (ctx) => h.cwdIs(ctx.fs, `/home/student/${path}`) && h.stdoutIncludes(ctx.result, file),
    });
  });

  // Template D: check permissions/executability before "trusting" a file.
  drills.push({
    id: 'p-quest-perm-check-script',
    difficulty: 2,
    prompt: 'У проєкті webapp є скрипт deploy.sh. Перш ніж комусь радити його запускати, перевір, чи він взагалі має права на виконання.',
    hint: 'cd projects/webapp && ls -l deploy.sh',
    solution: 'cd projects/webapp && ls -l deploy.sh',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'rwxr-xr-x') && h.stdoutIncludes(ctx.result, 'deploy.sh'),
  });
  drills.push({
    id: 'p-quest-perm-check-notes',
    difficulty: 2,
    prompt: 'Перевір права доступу до файлу notes.txt у documents — переконайся, що він НЕ виконуваний, перш ніж читати його вміст.',
    hint: 'cd documents && ls -l notes.txt && cat notes.txt',
    solution: 'cd documents && ls -l notes.txt && cat notes.txt',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, '-rw-r--r--') && h.stdoutIncludes(ctx.result, 'Buy coffee'),
  });

  // Template E: search across an unknown location, then aggregate.
  const GREP_COUNT_TARGETS = [
    { word: 'ERROR', count: '2' },
    { word: 'INFO', count: '3' },
    { word: 'WARN', count: '1' },
  ];
  GREP_COUNT_TARGETS.forEach(({ word, count }, i) => {
    drills.push({
      id: `p-quest-grep-count-${i}`,
      difficulty: 3,
      prompt: `Десь у своїх проєктах лежить лог-файл, але ти не пам'ятаєш, у якій саме підпапці. З'ясуй, скільки рядків у директорії projects містять слово ${word}.`,
      hint: `grep -r ${word} projects | wc -l`,
      solution: `grep -r ${word} projects | wc -l`,
      xp: 30,
      check: (ctx) => h.stdoutTrim(ctx.result) === count,
    });
  });

  // Template F: go back up, then descend into a different branch.
  drills.push({
    id: 'p-quest-updown-inventory',
    difficulty: 3,
    prompt: 'Зайди в projects/webapp/src, потім повернись на три рівні вище (у домашню директорію), а звідти зайди в documents і подивись, скільки товарів (рядків без заголовка) є у inventory.csv.',
    hint: 'cd projects/webapp/src && cd ../../.. && cd documents && tail -n +2 inventory.csv | wc -l',
    solution: 'cd projects/webapp/src && cd ../../.. && cd documents && tail -n +2 inventory.csv | wc -l',
    xp: 35,
    check: (ctx) => h.cwdIs(ctx.fs, '/home/student/documents') && h.stdoutTrim(ctx.result) === '5',
  });
  drills.push({
    id: 'p-quest-updown-servers',
    difficulty: 2,
    prompt: 'Зайди в k8s, потім повернись у домашню директорію (не вказуючи повний шлях), а звідти зайди в documents і виведи список серверів із servers.txt.',
    hint: 'cd k8s && cd .. && cd documents && cat servers.txt',
    solution: 'cd k8s && cd .. && cd documents && cat servers.txt',
    xp: 25,
    check: (ctx) => h.cwdIs(ctx.fs, '/home/student/documents') && h.stdoutIncludes(ctx.result, 'web-01'),
  });

  return drills;
}

module.exports = { build };
