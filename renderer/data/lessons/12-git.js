'use strict';
const h = require('./helpers');

module.exports = {
  id: 'git',
  title: 'Git основи',
  icon: '🔧',
  description: 'init, add, commit, branch, log — контроль версій.',
  practice: require('./practice/git').build(),
  drills: [
    {
      id: 'git-1',
      difficulty: 2,
      prompt: 'Створи нову директорію myapp, перейди в неї та ініціалізуй git-репозиторій.',
      hint: 'mkdir + cd + git init',
      solution: 'mkdir myapp && cd myapp && git init',
      xp: 20,
      check: (ctx) => ctx.state.gitRepos.has(ctx.fs.normalize('/home/student/myapp')),
    },
    {
      id: 'git-2',
      difficulty: 1,
      prompt: 'Створи файл README.md і перевір статус репозиторію.',
      hint: 'touch README.md && git status',
      solution: 'touch README.md && git status',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'On branch'),
    },
    {
      id: 'git-3',
      difficulty: 1,
      prompt: 'Додай файл README.md в область підготовлених змін (staging).',
      hint: 'git add <файл>',
      solution: 'git add README.md',
      xp: 15,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.staged.has('README.md');
      },
    },
    {
      id: 'git-4',
      difficulty: 2,
      prompt: 'Зроби перший коміт із повідомленням "Initial commit".',
      hint: "git commit -m 'повідомлення'",
      solution: 'git commit -m "Initial commit"',
      xp: 20,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.commits.some((c) => c.message === 'Initial commit');
      },
    },
    {
      id: 'git-5',
      difficulty: 2,
      prompt: 'Створи нову гілку feature/login і одразу перейди на неї.',
      hint: 'git checkout -b <назва_гілки>',
      solution: 'git checkout -b feature/login',
      xp: 20,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.currentBranch === 'feature/login';
      },
    },
    {
      id: 'git-6',
      difficulty: 1,
      prompt: 'Виведи список усіх гілок репозиторію.',
      hint: 'git branch',
      solution: 'git branch',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'feature/login') && h.stdoutIncludes(ctx.result, 'main'),
    },
    {
      id: 'git-7',
      difficulty: 1,
      prompt: 'Поверніся на гілку main.',
      hint: 'git checkout main',
      solution: 'git checkout main',
      xp: 15,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.currentBranch === 'main';
      },
    },
    {
      id: 'git-8',
      difficulty: 1,
      prompt: 'Переглянь історію комітів у компактному однорядковому форматі.',
      hint: 'git log --oneline',
      solution: 'git log --oneline',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'Initial commit'),
    },
    {
      id: 'git-9',
      difficulty: 3,
      prompt: 'Додай віддалений репозиторій origin, що вказує на https://github.com/student/myapp.git',
      hint: 'git remote add origin <url>',
      solution: 'git remote add origin https://github.com/student/myapp.git',
      xp: 20,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.remotes.origin === 'https://github.com/student/myapp.git';
      },
    },
    {
      id: 'git-10',
      difficulty: 2,
      prompt: 'Створи файл config.yml, додай його в staging, а потім тимчасово сховай ці зміни (git stash).',
      hint: 'touch config.yml && git add config.yml && git stash',
      solution: 'touch config.yml && git add config.yml && git stash',
      xp: 25,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.stashes.length === 1 && repo.staged.size === 0;
      },
    },
    {
      id: 'git-11',
      difficulty: 2,
      prompt: 'Поверни щойно сховані зміни назад командою git stash pop.',
      hint: 'git stash pop',
      solution: 'git stash pop',
      xp: 20,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.stashes.length === 0 && repo.staged.has('config.yml');
      },
    },
    {
      id: 'git-12',
      difficulty: 1,
      prompt: 'Зніми config.yml зі staging командою git reset (щоб він знову став непідготовленим).',
      hint: 'git reset',
      solution: 'git reset',
      xp: 15,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.staged.size === 0;
      },
    },
    {
      id: 'git-13',
      difficulty: 2,
      prompt: 'Познач поточний коміт (Initial commit) легковаговою міткою v1.0.',
      hint: 'git tag v1.0',
      solution: 'git tag v1.0',
      xp: 20,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && !!repo.tags['v1.0'];
      },
    },
    {
      id: 'git-14',
      difficulty: 2,
      prompt: 'Подивись деталі останнього коміту командою git show.',
      hint: 'git show',
      solution: 'git show',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'Initial commit'),
    },
    {
      id: 'git-15',
      difficulty: 2,
      prompt: 'Створи файл temp.log, закомить його, а потім видали командою git rm.',
      hint: 'touch temp.log && git add temp.log && git commit -m "Add temp.log" && git rm temp.log',
      solution: 'touch temp.log && git add temp.log && git commit -m "Add temp.log" && git rm temp.log',
      xp: 25,
      check: (ctx) => !ctx.fs.exists('/home/student/myapp/temp.log'),
    },
  ],
};
