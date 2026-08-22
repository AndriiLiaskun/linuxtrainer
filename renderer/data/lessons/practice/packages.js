'use strict';

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

  return drills;
}

module.exports = { build };
