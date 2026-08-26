'use strict';
const h = require('../helpers');

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
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && r.remotes.origin === `https://github.com/student/${repo}.git` && ctx.input.includes('fetch');
      },
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

  const CONFIG_NAMES = ['Andrii', 'Olena', 'Dmytro'];
  CONFIG_NAMES.forEach((name, i) => {
    drills.push({
      id: `p-git-config-${i}`,
      difficulty: 1,
      prompt: `Встанови глобальне ім'я користувача git на "${name}".`,
      hint: `git config --global user.name "${name}"`,
      solution: `git config --global user.name "${name}"`,
      xp: 15,
      check: (ctx) => ctx.state.gitConfig['user.name'] === name,
    });
  });
  drills.push({
    id: 'p-git-config-list',
    difficulty: 2,
    prompt: "Встанови user.name та user.email глобально, а потім перевір усі налаштування списком.",
    hint: 'git config --global user.name "Student" && git config --global user.email student@example.com && git config --list',
    solution: 'git config --global user.name "Student" && git config --global user.email student@example.com && git config --list',
    xp: 25,
    check: (ctx) => (ctx.result.stdout || '').includes('user.name=Student') && (ctx.result.stdout || '').includes('user.email=student@example.com'),
  });

  const CLONE_TARGETS = [
    { url: 'https://github.com/student/api-service.git', name: 'api-service' },
    { url: 'https://github.com/student/frontend.git', name: 'frontend' },
    { url: 'https://github.com/student/infra-tools.git', name: 'infra-tools' },
  ];
  CLONE_TARGETS.forEach(({ url, name }, i) => {
    drills.push({
      id: `p-git-clone-${i}`,
      difficulty: 2,
      prompt: `Клонуй репозиторій ${url} у поточну директорію.`,
      hint: `git clone ${url}`,
      solution: `git clone ${url}`,
      xp: 25,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${name}`));
        return !!r && r.remotes.origin === url;
      },
    });
  });

  drills.push({
    id: 'p-git-diff-basic',
    difficulty: 1,
    prompt: 'У репозиторії demo: застейдж файл і перевір різницю командою git diff.',
    hint: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git diff',
    solution: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git diff',
    xp: 20,
    check: (ctx) => ctx.input.includes('git diff') && ctx.result.code === 0,
  });
  drills.push({
    id: 'p-git-diff-staged',
    difficulty: 2,
    prompt: 'У репозиторії demo: застейдж файл і перевір, що саме буде закомічено, командою git diff --staged.',
    hint: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git diff --staged',
    solution: 'mkdir demo && cd demo && git init && touch a.txt && git add a.txt && git diff --staged',
    xp: 20,
    check: (ctx) => ctx.input.includes('--staged') && ctx.result.code === 0,
  });

  BRANCHES.forEach((branch, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-switch-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: створи гілку ${branch} і одразу перейди на неї командою git switch -c.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && git switch -c ${branch}`,
      solution: `mkdir ${repo} && cd ${repo} && git init && git switch -c ${branch}`,
      xp: 25,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && r.currentBranch === branch;
      },
    });
  });

  BRANCHES.forEach((branch, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-merge-${i}`,
      difficulty: 3,
      prompt: `У новому репозиторії ${repo}: створи гілку ${branch}, а потім злий її у поточну гілку (main).`,
      hint: `mkdir ${repo} && cd ${repo} && git init && git branch ${branch} && git merge ${branch}`,
      solution: `mkdir ${repo} && cd ${repo} && git init && git branch ${branch} && git merge ${branch}`,
      xp: 30,
      check: (ctx) => (ctx.result.stdout || '').includes('Merge made'),
    });
  });

  const PULL_REPOS = ['service-a', 'service-b'];
  PULL_REPOS.forEach((repo, i) => {
    drills.push({
      id: `p-git-pull-${i}`,
      difficulty: 2,
      prompt: `У репозиторії ${repo}: додай remote origin і виконай git pull.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && git remote add origin https://github.com/student/${repo}.git && git pull`,
      solution: `mkdir ${repo} && cd ${repo} && git init && git remote add origin https://github.com/student/${repo}.git && git pull`,
      xp: 25,
      check: (ctx) => (ctx.result.stdout || '').includes('up to date'),
    });
  });

  drills.push({
    id: 'p-git-push-no-remote',
    difficulty: 2,
    prompt: 'У новому репозиторії demo (без remote): спробуй git push і зверни увагу на помилку.',
    hint: 'mkdir demo && cd demo && git init && git push',
    solution: 'mkdir demo && cd demo && git init && git push',
    xp: 20,
    check: (ctx) => (ctx.result.stderr || '').includes('No configured push destination'),
  });
  drills.push({
    id: 'p-git-push-with-remote',
    difficulty: 2,
    prompt: 'У репозиторії demo: додай remote origin і виконай git push.',
    hint: 'mkdir demo && cd demo && git init && git remote add origin https://github.com/student/demo.git && git push',
    solution: 'mkdir demo && cd demo && git init && git remote add origin https://github.com/student/demo.git && git push',
    xp: 25,
    check: (ctx) => (ctx.result.stdout || '').includes('up-to-date'),
  });

  BRANCHES.forEach((branch, i) => {
    const repo = REPOS[i % REPOS.length];
    drills.push({
      id: `p-git-branch-delete-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: створи гілку ${branch}, а потім видали її командою git branch -d.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && git branch ${branch} && git branch -d ${branch}`,
      solution: `mkdir ${repo} && cd ${repo} && git init && git branch ${branch} && git branch -d ${branch}`,
      xp: 25,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && !r.branches.includes(branch);
      },
    });
  });
  drills.push({
    id: 'p-git-branch-delete-checked-out-fails',
    difficulty: 3,
    prompt: 'У репозиторії demo: спробуй видалити ПОТОЧНУ гілку (main) і зверни увагу на помилку — git не дозволяє видалити гілку, на якій зараз стоїш.',
    hint: 'mkdir demo && cd demo && git init && git branch -d main',
    solution: 'mkdir demo && cd demo && git init && git branch -d main',
    xp: 25,
    check: (ctx) => (ctx.result.stderr || '').includes('checked out'),
  });

  BRANCHES.forEach((branch, i) => {
    const repo = REPOS[i % REPOS.length];
    const renamed = branch.replace('/', '-') + '-v2';
    drills.push({
      id: `p-git-branch-rename-${i}`,
      difficulty: 2,
      prompt: `У новому репозиторії ${repo}: створи гілку ${branch}, а потім перейменуй її на ${renamed} командою git branch -m.`,
      hint: `mkdir ${repo} && cd ${repo} && git init && git branch ${branch} && git branch -m ${branch} ${renamed}`,
      solution: `mkdir ${repo} && cd ${repo} && git init && git branch ${branch} && git branch -m ${branch} ${renamed}`,
      xp: 25,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/${repo}`));
        return !!r && !r.branches.includes(branch) && r.branches.includes(renamed);
      },
    });
  });
  drills.push({
    id: 'p-git-branch-rename-current',
    difficulty: 2,
    prompt: "У репозиторії demo: перейменуй ПОТОЧНУ гілку (main) на trunk одним аргументом (без вказання старої назви) командою git branch -M.",
    hint: 'mkdir demo && cd demo && git init && git branch -M trunk',
    solution: 'mkdir demo && cd demo && git init && git branch -M trunk',
    xp: 25,
    check: (ctx) => {
      const r = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/demo'));
      return !!r && r.currentBranch === 'trunk' && r.branches.includes('trunk') && !r.branches.includes('main');
    },
  });

  drills.push({
    id: 'p-git-branch-copy',
    difficulty: 3,
    prompt: "У репозиторії demo: створи гілку feature-a, а потім скопіюй її під назвою feature-a-backup командою git branch -c (оригінал feature-a має лишитись на місці).",
    hint: 'mkdir demo && cd demo && git init && git branch feature-a && git branch -c feature-a feature-a-backup',
    solution: 'mkdir demo && cd demo && git init && git branch feature-a && git branch -c feature-a feature-a-backup',
    xp: 30,
    check: (ctx) => {
      const r = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/demo'));
      return !!r && r.branches.includes('feature-a') && r.branches.includes('feature-a-backup');
    },
  });
  drills.push({
    id: 'p-git-branch-duplicate-name-fails',
    difficulty: 2,
    prompt: 'У репозиторії demo: створи гілку feature-a, а потім спробуй створити гілку з такою ж назвою ще раз — переконайся, що це помилка (git не дозволяє дублікати).',
    hint: 'mkdir demo && cd demo && git init && git branch feature-a && git branch feature-a',
    solution: 'mkdir demo && cd demo && git init && git branch feature-a && git branch feature-a',
    xp: 20,
    check: (ctx) => (ctx.result.stderr || '').includes('already exists'),
  });

  const CLONE_BRANCHES = ['develop', 'staging', 'release-2.0'];
  CLONE_BRANCHES.forEach((branch, i) => {
    drills.push({
      id: `p-git-clone-branch-${i}`,
      difficulty: 2,
      prompt: `Клонуй репозиторій https://github.com/student/svc.git одразу на гілку ${branch} (не на main).`,
      hint: `git clone -b ${branch} https://github.com/student/svc.git`,
      solution: `git clone -b ${branch} https://github.com/student/svc.git`,
      xp: 25,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize('/home/student/svc'));
        return !!r && r.currentBranch === branch;
      },
    });
  });

  drills.push({
    id: 'p-git-status-short',
    difficulty: 2,
    prompt: 'У репозиторії demo: застейдж файл config.yml, а потім перевір статус у КОРОТКОМУ форматі (git status -s).',
    hint: 'mkdir demo && cd demo && git init && touch config.yml && git add config.yml && git status -s',
    solution: 'mkdir demo && cd demo && git init && touch config.yml && git add config.yml && git status -s',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'A  config.yml'),
  });

  const ADD_ALL_SETS = [
    ['a.txt', 'b.txt'],
    ['index.html', 'style.css', 'app.js'],
  ];
  ADD_ALL_SETS.forEach((files, i) => {
    drills.push({
      id: `p-git-add-all-${i}`,
      difficulty: 2,
      prompt: `У репозиторії demo${i}: створи файли ${files.join(', ')}, а потім застейдж УСІ одразу командою git add -A.`,
      hint: `mkdir demo${i} && cd demo${i} && git init && touch ${files.join(' ')} && git add -A`,
      solution: `mkdir demo${i} && cd demo${i} && git init && touch ${files.join(' ')} && git add -A`,
      xp: 25,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/demo${i}`));
        return !!r && r.staged.size > 0;
      },
    });
  });

  drills.push({
    id: 'p-git-remote-verbose',
    difficulty: 2,
    prompt: "У репозиторії demo: додай remote origin, а потім перевір URL-адреси всіх remote'ів командою git remote -v.",
    hint: 'mkdir demo && cd demo && git init && git remote add origin https://github.com/student/demo.git && git remote -v',
    solution: 'mkdir demo && cd demo && git init && git remote add origin https://github.com/student/demo.git && git remote -v',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, '(fetch)') && h.stdoutIncludes(ctx.result, '(push)'),
  });

  drills.push({
    id: 'p-git-push-set-upstream',
    difficulty: 3,
    prompt: "У репозиторії demo: додай remote origin, а потім відправ поточну гілку і одразу запам'ятай її як типову для майбутніх push командою git push -u.",
    hint: 'mkdir demo && cd demo && git init && git remote add origin https://github.com/student/demo.git && git push -u origin main',
    solution: 'mkdir demo && cd demo && git init && git remote add origin https://github.com/student/demo.git && git push -u origin main',
    xp: 30,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'set up to track'),
  });

  const CACHED_FILES = ['secret.env', 'credentials.json', '.env.local'];
  CACHED_FILES.forEach((file, i) => {
    drills.push({
      id: `p-git-rm-cached-${i}`,
      difficulty: 3,
      prompt: `У новому репозиторії demo-cached-${i}: створи й застейдж файл ${file}, а потім прибери його з відстеження git командою git rm --cached, НЕ видаляючи сам файл з диска.`,
      hint: `mkdir demo-cached-${i} && cd demo-cached-${i} && git init && touch ${file} && git add ${file} && git rm --cached ${file}`,
      solution: `mkdir demo-cached-${i} && cd demo-cached-${i} && git init && touch ${file} && git add ${file} && git rm --cached ${file}`,
      xp: 30,
      check: (ctx) => {
        const r = ctx.state.gitRepos.get(ctx.fs.normalize(`/home/student/demo-cached-${i}`));
        return !!r && !r.tracked.has(file) && ctx.fs.exists(`/home/student/demo-cached-${i}/${file}`);
      },
    });
  });

  return drills;
}

module.exports = { build };
