'use strict';
const h = require('../helpers');

// name -> initial {active, enabled} from state.js freshServices()
const SERVICES = {
  nginx: { active: true, enabled: true },
  sshd: { active: true, enabled: true },
  docker: { active: false, enabled: true },
  cron: { active: true, enabled: true },
  postgresql: { active: false, enabled: false },
  'app.service': { active: false, enabled: false },
};

function build() {
  const drills = [];
  let i = 0;

  for (const [name, s] of Object.entries(SERVICES)) {
    const shortName = name.replace('.service', '');
    i++;
    drills.push({
      id: `p-sysd-status-${i}`,
      difficulty: 1,
      prompt: `Перевір статус сервісу ${name}.`,
      hint: `systemctl status ${name}`,
      solution: `systemctl status ${name}`,
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, shortName),
    });

    if (s.active) {
      drills.push({
        id: `p-sysd-stop-${i}`,
        difficulty: 1,
        prompt: `Зупини сервіс ${name}.`,
        hint: `systemctl stop ${name}`,
        solution: `systemctl stop ${name}`,
        xp: 15,
        check: (ctx) => {
          const svc = ctx.state.services[name] || ctx.state.services[shortName];
          return svc && svc.active === false;
        },
      });
      drills.push({
        id: `p-sysd-restart-${i}`,
        difficulty: 2,
        prompt: `Перезапусти сервіс ${name}.`,
        hint: `systemctl restart ${name}`,
        solution: `systemctl restart ${name}`,
        xp: 15,
        check: (ctx) => {
          const svc = ctx.state.services[name] || ctx.state.services[shortName];
          return svc && svc.active === true;
        },
      });
      drills.push({
        id: `p-sysd-isactive-${i}`,
        difficulty: 1,
        prompt: `Переконайся через is-active, що сервіс ${name} активний (код завершення 0).`,
        hint: `systemctl is-active ${name}`,
        solution: `systemctl is-active ${name}`,
        xp: 15,
        check: (ctx) => h.stdoutTrim(ctx.result) === 'active',
      });
    } else {
      drills.push({
        id: `p-sysd-start-${i}`,
        difficulty: 1,
        prompt: `Запусти сервіс ${name}.`,
        hint: `systemctl start ${name}`,
        solution: `systemctl start ${name}`,
        xp: 15,
        check: (ctx) => {
          const svc = ctx.state.services[name] || ctx.state.services[shortName];
          return svc && svc.active === true;
        },
      });
    }

    if (s.enabled) {
      drills.push({
        id: `p-sysd-disable-${i}`,
        difficulty: 2,
        prompt: `Вимкни автозапуск сервісу ${name}.`,
        hint: `systemctl disable ${name}`,
        solution: `systemctl disable ${name}`,
        xp: 15,
        check: (ctx) => {
          const svc = ctx.state.services[name] || ctx.state.services[shortName];
          return svc && svc.enabled === false;
        },
      });
    } else {
      drills.push({
        id: `p-sysd-enable-${i}`,
        difficulty: 2,
        prompt: `Увімкни автозапуск сервісу ${name}.`,
        hint: `systemctl enable ${name}`,
        solution: `systemctl enable ${name}`,
        xp: 15,
        check: (ctx) => {
          const svc = ctx.state.services[name] || ctx.state.services[shortName];
          return svc && svc.enabled === true;
        },
      });
    }

    drills.push({
      id: `p-sysd-journal-${i}`,
      difficulty: 2,
      prompt: `Переглянь системний журнал для сервісу ${name}.`,
      hint: `journalctl -u ${name}`,
      solution: `journalctl -u ${name}`,
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, shortName),
    });
  }

  drills.push({
    id: 'p-sysd-list-units',
    difficulty: 1,
    prompt: 'Виведи список усіх юнітів systemd.',
    hint: 'systemctl list-units',
    solution: 'systemctl list-units',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'nginx') && h.stdoutIncludes(ctx.result, 'sshd'),
  });

  const MASK_TARGETS = ['postgresql', 'app.service', 'docker'];
  MASK_TARGETS.forEach((name, idx) => {
    drills.push({
      id: `p-sysd-mask-${idx}`,
      difficulty: 2,
      prompt: `Повністю заблокуй запуск сервісу ${name} командою systemctl mask (сильніше за disable).`,
      hint: `systemctl mask ${name}`,
      solution: `systemctl mask ${name}`,
      xp: 20,
      check: (ctx) => ctx.state.services[name].masked === true,
    });
  });
  drills.push({
    id: 'p-sysd-mask-blocks-start',
    difficulty: 3,
    prompt: "Заблокуй сервіс postgresql командою mask, а потім спробуй запустити його — переконайся, що навіть ручний запуск відхилено (на відміну від disable).",
    hint: 'systemctl mask postgresql && systemctl start postgresql',
    solution: 'systemctl mask postgresql && systemctl start postgresql',
    xp: 25,
    check: (ctx) => (ctx.result.stderr || '').includes('is masked'),
  });
  drills.push({
    id: 'p-sysd-unmask',
    difficulty: 2,
    prompt: 'Заблокуй сервіс postgresql (mask), а потім зніми блокування (unmask) і переконайся, що тепер його можна запустити.',
    hint: 'systemctl mask postgresql && systemctl unmask postgresql && systemctl start postgresql',
    solution: 'systemctl mask postgresql && systemctl unmask postgresql && systemctl start postgresql',
    xp: 30,
    check: (ctx) => ctx.state.services.postgresql.masked === false && ctx.state.services.postgresql.active === true,
  });
  drills.push({
    id: 'p-sysd-is-enabled-masked',
    difficulty: 2,
    prompt: 'Заблокуй сервіс app.service (mask), а потім перевір його стан автозапуску командою is-enabled — зверни увагу, що він показує "masked", а не "disabled".',
    hint: 'systemctl mask app.service && systemctl is-enabled app.service',
    solution: 'systemctl mask app.service && systemctl is-enabled app.service',
    xp: 25,
    check: (ctx) => h.stdoutTrim(ctx.result).endsWith('masked'),
  });

  return drills;
}

module.exports = { build };
