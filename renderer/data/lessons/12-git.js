'use strict';
const h = require('./helpers');

module.exports = {
  id: 'git',
  title: 'Git основи',
  icon: '🔧',
  description: 'init, add, commit, branch, log — контроль версій.',
  drills: [
    {
      id: 'git-1',
      prompt: 'Створи нову директорію myapp, перейди в неї та ініціалізуй git-репозиторій.',
      hint: 'mkdir + cd + git init',
      solution: 'mkdir myapp && cd myapp && git init',
      xp: 20,
      check: (ctx) => ctx.state.gitRepos.has(ctx.fs.normalize('/home/student/myapp')),
    },
    {
      id: 'git-2',
      prompt: 'Створи файл README.md і перевір статус репозиторію.',
      hint: 'touch README.md && git status',
      solution: 'touch README.md && git status',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'On branch'),
    },
    {
      id: 'git-3',
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
      prompt: 'Виведи список усіх гілок репозиторію.',
      hint: 'git branch',
      solution: 'git branch',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'feature/login') && h.stdoutIncludes(ctx.result, 'main'),
    },
    {
      id: 'git-7',
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
      prompt: 'Переглянь історію комітів у компактному однорядковому форматі.',
      hint: 'git log --oneline',
      solution: 'git log --oneline',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'Initial commit'),
    },
    {
      id: 'git-9',
      prompt: 'Додай віддалений репозиторій origin, що вказує на https://github.com/student/myapp.git',
      hint: 'git remote add origin <url>',
      solution: 'git remote add origin https://github.com/student/myapp.git',
      xp: 20,
      check: (ctx) => {
        const repo = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myapp'));
        return !!repo && repo.remotes.origin === 'https://github.com/student/myapp.git';
      },
    },
  ],
};
