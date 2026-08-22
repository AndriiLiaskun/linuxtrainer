'use strict';

const REPOS = ['myapp', 'billing-service', 'infra-tools', 'auth-api'];
const COMMIT_MSGS = ['Initial commit', 'Fix bug in parser', 'Add health check endpoint', 'Update dependencies'];
const BRANCHES = ['feature/login', 'feature/payments', 'bugfix/timeout', 'hotfix/security'];

function build() {
  const drills = [];

  REPOS.forEach((repo, i) => {
    drills.push({
      id: `p-git-init-${i}`,
      difficulty: 1,
      prompt: `Створи директорію ${repo}, перейди в неї та ініціалізуй git-репозиторій.`,
      hint: `mkdir ${repo} && cd ${repo} && git init`,
      solution: `mkdir ${repo} && cd ${repo} && git init`,
      xp: 20,
      check: (ctx) => ctx.state.gitRepos.has(ctx.fs.normalize(`/home/student/${repo}`)),
    });
  });

  COMMIT_MSGS.forEach((msg, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-commit-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: створи файл main.js, додай його в staging і закомить із повідомленням "${msg}".`,
      hint: `mkdir ${repo} && cd ${repo} && git init && touch main.js && git add main.js && git commit -m "${msg}"`,
      solution: `mkdir ${repo} && cd ${repo} && git init && touch main.js && git add main.js && git commit -m "${msg}"`,
      xp: 30,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && r.commits.some((c) => c.message === msg);
      },
    });
  });

  BRANCHES.forEach((branch, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-branch-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: створи гілку ${branch} і перейди на неї.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && git checkout -b ${branch}`,
      solution: `mkdir ${repo} && cd ${repo} && git init && git checkout -b ${branch}`,
      xp: 25,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && r.currentBranch === branch;
      },
    });
  });

  drills.push({
    id: 'p-git-status-clean',
    difficulty: 1,
    prompt: 'Створи новий репозиторій і перевір його статус.',
    hint: 'mkdir demo && cd demo && git init && git status',
    solution: 'mkdir demo && cd demo && git init && git status',
    xp: 20,
    check: (ctx) => (ctx.result.stdout || '').includes('On branch'),
  });
  drills.push({
    id: 'p-git-log-oneline',
    difficulty: 2,
    prompt: 'Створи репозиторій, зроби коміт "Setup project", перевір лог у форматі --oneline.',
    hint: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git commit -m "Setup project" && git log --oneline',
    solution: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git commit -m "Setup project" && git log --oneline',
    xp: 30,
    check: (ctx) => (ctx.result.stdout || '').includes('Setup project'),
  });
  drills.push({
    id: 'p-git-remote',
    difficulty: 3,
    prompt: 'Створи репозиторій myrepo і додай віддалений origin, що вказує на https://github.com/student/myrepo.git.',
    hint: 'mkdir myrepo && cd myrepo && git init && git remote add origin https://github.com/student/myrepo.git',
    solution: 'mkdir myrepo && cd myrepo && git init && git remote add origin https://github.com/student/myrepo.git',
    xp: 25,
    check: (ctx) => {
      const r = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/myrepo'));
      return !!r && r.remotes.origin === 'https://github.com/student/myrepo.git';
    },
  });
  drills.push({
    id: 'p-git-not-a-repo',
    difficulty: 2,
    prompt: 'Переконайся, що документи не є git-репозиторієм (спробуй git status там і зверни увагу на помилку).',
    hint: 'cd documents && git status',
    solution: 'cd documents && git status',
    xp: 15,
    check: (ctx) => (ctx.result.stderr || '').includes('not a git repository'),
  });

  return drills;
}

module.exports = { build };
