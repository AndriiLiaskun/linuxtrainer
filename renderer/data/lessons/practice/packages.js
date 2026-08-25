'use strict';
const h = require('../helpers');

const INSTALLABLE = ['nginx', 'htop', 'tree', 'vim', 'python3', 'nodejs', 'postgresql', 'unzip', 'zip', 'docker.io'];
const REMOVABLE = ['git', 'curl']; // present in the seeded "installed" set

function build() {
  const drills = [];

  INSTALLABLE.forEach((pkg, i) => {
    drills.push({
      id: `p-pkg-install-${i}`,
      difficulty: 1,
      prompt: `Встанови пакет ${pkg} через apt.`,
      hint: `apt install -y ${pkg}`,
      solution: `apt install -y ${pkg}`,
      xp: 15,
      check: (ctx) => ctx.state.packages.has(pkg),
    });
  });

  for (let i = 0; i < INSTALLABLE.length - 1; i += 2) {
    const a = INSTALLABLE[i];
    const b = INSTALLABLE[i + 1];
    drills.push({
      id: `p-pkg-install-multi-${i}`,
      difficulty: 2,
      prompt: `Встанови одразу два пакети: ${a} і ${b}.`,
      hint: `apt install -y ${a} ${b}`,
      solution: `apt install -y ${a} ${b}`,
      xp: 20,
      check: (ctx) => ctx.state.packages.has(a) && ctx.state.packages.has(b),
    });
  }

  REMOVABLE.forEach((pkg, i) => {
    drills.push({
      id: `p-pkg-remove-${i}`,
      difficulty: 1,
      prompt: `Видали пакет ${pkg}, який більше не потрібен.`,
      hint: `apt remove -y ${pkg}`,
      solution: `apt remove -y ${pkg}`,
      xp: 15,
      check: (ctx) => !ctx.state.packages.has(pkg),
    });
  });

  drills.push({
    id: 'p-pkg-update',
    difficulty: 1,
    prompt: 'Онови список доступних пакетів.',
    hint: 'apt update',
    solution: 'apt update',
    xp: 10,
    check: (ctx) => (ctx.result.stdout || '').includes('Reading package lists'),
  });
  drills.push({
    id: 'p-pkg-search',
    difficulty: 2,
    prompt: 'Знайди в репозиторії пакети, назва яких містить "docker".',
    hint: 'apt search docker',
    solution: 'apt search docker',
    xp: 15,
    check: (ctx) => (ctx.result.stdout || '').includes('docker'),
  });
  drills.push({
    id: 'p-pkg-list-installed',
    difficulty: 1,
    prompt: 'Виведи список усіх встановлених пакетів.',
    hint: 'apt list --installed',
    solution: 'apt list --installed',
    xp: 15,
    check: (ctx) => (ctx.result.stdout || '').includes('coreutils'),
  });
  drills.push({
    id: 'p-pkg-fail-install',
    difficulty: 2,
    prompt: 'Спробуй встановити пакет definitely-not-a-real-package і переконайся, що це завершується помилкою.',
    hint: 'apt install -y definitely-not-a-real-package',
    solution: 'apt install -y definitely-not-a-real-package',
    xp: 15,
    check: (ctx) => ctx.result.code !== 0,
  });

  const YUM_PKGS = ['httpd', 'tree', 'wget'];
  YUM_PKGS.forEach((pkg, i) => {
    drills.push({
      id: `p-pkg-yum-${i}`,
      difficulty: 1,
      prompt: `На RHEL/CentOS встанови пакет ${pkg} через yum.`,
      hint: `yum install -y ${pkg}`,
      solution: `yum install -y ${pkg}`,
      xp: 15,
      check: (ctx) => ctx.state.packages.has(pkg),
    });
  });

  const DNF_PKGS = ['vim', 'nodejs', 'git'];
  DNF_PKGS.forEach((pkg, i) => {
    drills.push({
      id: `p-pkg-dnf-${i}`,
      difficulty: 1,
      prompt: `На Fedora/RHEL 8+ встанови пакет ${pkg} через dnf (наступник yum).`,
      hint: `dnf install -y ${pkg}`,
      solution: `dnf install -y ${pkg}`,
      xp: 15,
      check: (ctx) => ctx.state.packages.has(pkg),
    });
  });

  drills.push({
    id: 'p-pkg-yum-repolist',
    difficulty: 2,
    prompt: 'Перевір список підключених репозиторіїв (yum repolist).',
    hint: 'yum repolist',
    solution: 'yum repolist',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'repo id'),
  });
  drills.push({
    id: 'p-pkg-yum-history',
    difficulty: 2,
    prompt: 'Перевір історію транзакцій пакетного менеджера (yum history).',
    hint: 'yum history',
    solution: 'yum history',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Command line'),
  });
  drills.push({
    id: 'p-pkg-yum-grouplist',
    difficulty: 2,
    prompt: 'Перевір список доступних груп пакетів (yum grouplist).',
    hint: 'yum grouplist',
    solution: 'yum grouplist',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Development Tools'),
  });
  drills.push({
    id: 'p-pkg-yum-groupinstall',
    difficulty: 2,
    prompt: "Встанови всю групу пакетів 'Development Tools' одразу (yum groupinstall).",
    hint: "yum groupinstall 'Development Tools'",
    solution: "yum groupinstall 'Development Tools'",
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, "Installing group 'Development Tools'"),
  });
  drills.push({
    id: 'p-pkg-apt-clean',
    difficulty: 1,
    prompt: 'Очисти кеш завантажених пакетів (apt clean all).',
    hint: 'apt clean all',
    solution: 'apt clean all',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Cleaning repos'),
  });
  drills.push({
    id: 'p-pkg-apt-info',
    difficulty: 2,
    prompt: 'Перевір детальну інформацію про пакет git (apt info).',
    hint: 'apt info git',
    solution: 'apt info git',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Name: git'),
  });

  drills.push({
    id: 'p-pkg-rpm-qa',
    difficulty: 2,
    prompt: 'Виведи список УСІХ встановлених rpm-пакетів (rpm -qa).',
    hint: 'rpm -qa',
    solution: 'rpm -qa',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'bash-1.0'),
  });
  drills.push({
    id: 'p-pkg-rpm-q-installed',
    difficulty: 2,
    prompt: 'Встанови пакет httpd через yum, а потім перевір це через rpm -q.',
    hint: 'yum install -y httpd && rpm -q httpd',
    solution: 'yum install -y httpd && rpm -q httpd',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'httpd-1.0-1'),
  });
  drills.push({
    id: 'p-pkg-rpm-qi',
    difficulty: 2,
    prompt: 'Встанови пакет git (вже встановлений типово) — перевір детальну rpm-інформацію про нього.',
    hint: 'rpm -qi git',
    solution: 'rpm -qi git',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Name        : git'),
  });
  drills.push({
    id: 'p-pkg-rpm-ql',
    difficulty: 2,
    prompt: 'Перевір список файлів, встановлених пакетом git (rpm -ql).',
    hint: 'rpm -ql git',
    solution: 'rpm -ql git',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, '/usr/bin/git'),
  });
  drills.push({
    id: 'p-pkg-rpm-erase',
    difficulty: 2,
    prompt: 'Видали пакет curl (вже встановлений типово) через низькорівневу команду rpm -e.',
    hint: 'rpm -e curl',
    solution: 'rpm -e curl',
    xp: 25,
    check: (ctx) => !ctx.state.packages.has('curl'),
  });

  drills.push({
    id: 'p-pkg-dpkg-i',
    difficulty: 2,
    prompt: 'Встанови .deb-пакет tree_1.7.0-3_amd64.deb низькорівневою командою dpkg.',
    hint: 'dpkg -i tree_1.7.0-3_amd64.deb',
    solution: 'dpkg -i tree_1.7.0-3_amd64.deb',
    xp: 20,
    check: (ctx) => ctx.state.packages.has('tree'),
  });
  drills.push({
    id: 'p-pkg-dpkg-l',
    difficulty: 2,
    prompt: 'Виведи список УСІХ встановлених .deb-пакетів (dpkg -l).',
    hint: 'dpkg -l',
    solution: 'dpkg -l',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'bash') && h.stdoutIncludes(ctx.result, 'ii'),
  });
  drills.push({
    id: 'p-pkg-dpkg-r',
    difficulty: 2,
    prompt: 'Видали пакет curl (вже встановлений типово) низькорівневою командою dpkg -r.',
    hint: 'dpkg -r curl',
    solution: 'dpkg -r curl',
    xp: 25,
    check: (ctx) => !ctx.state.packages.has('curl'),
  });
  drills.push({
    id: 'p-pkg-dpkg-L',
    difficulty: 2,
    prompt: 'Перевір список файлів, встановлених пакетом git (dpkg -L).',
    hint: 'dpkg -L git',
    solution: 'dpkg -L git',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, '/usr/bin/git'),
  });

  return drills;
}

module.exports = { build };
