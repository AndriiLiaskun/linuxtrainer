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

  const STASH_FILES = ['config.yml', 'settings.json', '.env.local', 'cache.tmp'];
  STASH_FILES.forEach((file, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-stash-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: створи файл ${file}, додай його в staging, а потім тимчасово сховай зміни (stash).`,
      hint: `mkdir ${repo} && cd ${repo} && git init && touch ${file} && git add ${file} && git stash`,
      solution: `mkdir ${repo} && cd ${repo} && git init && touch ${file} && git add ${file} && git stash`,
      xp: 30,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && r.stashes.length === 1 && r.staged.size === 0;
      },
    });
  });
  STASH_FILES.forEach((file, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-stash-pop-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: створи й застейдж файл ${file}, сховай зміни (stash), а потім поверни їх назад (stash pop).`,
      hint: `mkdir ${repo} && cd ${repo} && git init && touch ${file} && git add ${file} && git stash && git stash pop`,
      solution: `mkdir ${repo} && cd ${repo} && git init && touch ${file} && git add ${file} && git stash && git stash pop`,
      xp: 35,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && r.stashes.length === 0 && r.staged.has(file);
      },
    });
  });
  drills.push({
    id: 'p-git-stash-list',
    difficulty: 2,
    prompt: 'У репозиторії demo: двічі застейдж і сховай зміни (два різні файли), а потім перевір список сховищ командою git stash list.',
    hint: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git stash && touch b.txt && git add b.txt && git stash && git stash list',
    solution: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git stash && touch b.txt && git add b.txt && git stash && git stash list',
    xp: 30,
    check: (ctx) => ((ctx.result.stdout || '').match(/stash@\{\d+\}: WIP/g) || []).length === 2,
  });

  const TAG_NAMES = ['v1.0', 'v1.1', 'v2.0-beta', 'release-3.0'];
  TAG_NAMES.forEach((tag, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-tag-lightweight-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: зроби коміт "Release" і познач його легковаговою міткою ${tag}.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && touch a.txt && git add a.txt && git commit -m "Release" && git tag ${tag}`,
      solution: `mkdir ${repo} && cd ${repo} && git init && touch a.txt && git add a.txt && git commit -m "Release" && git tag ${tag}`,
      xp: 30,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && !!r.tags[tag];
      },
    });
  });
  const ANNOTATED_TAGS = [
    { tag: 'v1.0', msg: 'First stable release' },
    { tag: 'v2.0', msg: 'Major rewrite' },
    { tag: 'v3.0-rc1', msg: 'Release candidate' },
  ];
  ANNOTATED_TAGS.forEach(({ tag, msg }, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-tag-annotated-${i}`,
      difficulty: 3,
      prompt: `У новому репозиторії ${repo}: зроби коміт, а потім створи анотовану мітку ${tag} з повідомленням "${msg}".`,
      hint: `mkdir ${repo} && cd ${repo} && git init && touch a.txt && git add a.txt && git commit -m "Setup" && git tag -a ${tag} -m "${msg}"`,
      solution: `mkdir ${repo} && cd ${repo} && git init && touch a.txt && git add a.txt && git commit -m "Setup" && git tag -a ${tag} -m "${msg}"`,
      xp: 35,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && r.tags[tag] && r.tags[tag].message === msg;
      },
    });
  });
  drills.push({
    id: 'p-git-tag-list',
    difficulty: 1,
    prompt: 'У репозиторії demo: зроби коміт, познач його мітками v1.0 та v1.1, а потім переглянь список усіх міток.',
    hint: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git commit -m "Setup" && git tag v1.0 && git tag v1.1 && git tag',
    solution: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git commit -m "Setup" && git tag v1.0 && git tag v1.1 && git tag',
    xp: 20,
    check: (ctx) => (ctx.result.stdout || '').includes('v1.0') && (ctx.result.stdout || '').includes('v1.1'),
  });
  drills.push({
    id: 'p-git-tag-duplicate',
    difficulty: 2,
    prompt: 'У репозиторії demo: зроби коміт, познач мітку v1.0, а потім спробуй створити мітку v1.0 ще раз і зверни увагу на помилку.',
    hint: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git commit -m "Setup" && git tag v1.0 && git tag v1.0',
    solution: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git commit -m "Setup" && git tag v1.0 && git tag v1.0',
    xp: 20,
    check: (ctx) => (ctx.result.stderr || '').includes('already exists'),
  });

  const RESET_FILES = ['a.txt', 'index.html', 'styles.css', 'notes.md'];
  RESET_FILES.forEach((file, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-reset-mixed-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: застейдж файл ${file}, а потім зніми його зі staging командою git reset.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && touch ${file} && git add ${file} && git reset`,
      solution: `mkdir ${repo} && cd ${repo} && git init && touch ${file} && git add ${file} && git reset`,
      xp: 25,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && r.staged.size === 0;
      },
    });
  });
  drills.push({
    id: 'p-git-reset-hard',
    difficulty: 3,
    prompt: 'У репозиторії demo: зроби коміт "Stable state", застейдж ще один файл, а потім відкинь усі незакомічені зміни командою git reset --hard.',
    hint: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git commit -m "Stable state" && touch b.txt && git add b.txt && git reset --hard',
    solution: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git commit -m "Stable state" && touch b.txt && git add b.txt && git reset --hard',
    xp: 30,
    check: (ctx) => {
      const r = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/demo'));
      return !!r && r.staged.size === 0 && (ctx.result.stdout || '').includes('Stable state');
    },
  });

  const FETCH_REPOS = ['myservice', 'toolkit'];
  FETCH_REPOS.forEach((repo, i) => {
    drills.push({
      id: `p-git-fetch-no-remote-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo} (без remote): спробуй git fetch і зверни увагу на помилку.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && git fetch`,
      solution: `mkdir ${repo} && cd ${repo} && git init && git fetch`,
      xp: 20,
      check: (ctx) => (ctx.result.stderr || '').includes('No remote repository'),
    });
  });
  FETCH_REPOS.forEach((repo, i) => {
    drills.push({
      id: `p-git-fetch-with-remote-${i}`,
      difficulty: 2,
      prompt: `У репозиторії ${repo}: додай remote origin і виконай git fetch origin.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && git remote add origin https://github.com/student/${repo}.git && git fetch origin`,
      solution: `mkdir ${repo} && cd ${repo} && git init && git remote add origin https://github.com/student/${repo}.git && git fetch origin`,
      xp: 25,
      check: (ctx) => ctx.result.code === 0,
    });
  });

  const SHOW_MESSAGES = ['Add config', 'Fix typo', 'Update README'];
  SHOW_MESSAGES.forEach((msg, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-show-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: зроби коміт "${msg}" і подивись його деталі командою git show.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && touch f.txt && git add f.txt && git commit -m "${msg}" && git show`,
      solution: `mkdir ${repo} && cd ${repo} && git init && touch f.txt && git add f.txt && git commit -m "${msg}" && git show`,
      xp: 30,
      check: (ctx) => (ctx.result.stdout || '').includes(msg),
    });
  });

  const RM_FILES = ['old.txt', 'debug.log', 'temp.cache', 'unused.js'];
  RM_FILES.forEach((file, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-rm-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: створи файл ${file}, закомить його, а потім видали командою git rm.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && touch ${file} && git add ${file} && git commit -m "Add ${file}" && git rm ${file}`,
      solution: `mkdir ${repo} && cd ${repo} && git init && touch ${file} && git add ${file} && git commit -m "Add ${file}" && git rm ${file}`,
      xp: 30,
      check: (ctx) => !ctx.fs.exists(`/home/student/${repo}/${file}`),
    });
  });

  return drills;
}

module.exports = { build };
