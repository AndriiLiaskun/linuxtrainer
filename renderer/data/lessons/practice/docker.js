'use strict';
const h = require('../helpers');

const RUNS = [
  { image: 'nginx', name: 'web' },
  { image: 'node:20-alpine', name: 'api' },
  { image: 'nginx', name: 'proxy' },
  { image: 'node:20-alpine', name: 'worker' },
];

function build() {
  const drills = [];

  RUNS.forEach((r, i) => {
    drills.push({
      id: `p-docker-run-${i}`,
      difficulty: 2,
      prompt: `Запусти контейнер з образу ${r.image} у фоновому режимі з ім'ям ${r.name}.`,
      hint: `docker run -d --name ${r.name} ${r.image}`,
      solution: `docker run -d --name ${r.name} ${r.image}`,
      xp: 20,
      check: (ctx) => ctx.state.docker.containers.some((c) => c.name === r.name && c.status === 'Up'),
    });
    drills.push({
      id: `p-docker-run-stop-${i}`,
      difficulty: 3,
      prompt: `Запусти контейнер ${r.name} з образу ${r.image}, а потім одразу зупини його.`,
      hint: `docker run -d --name ${r.name} ${r.image} && docker stop ${r.name}`,
      solution: `docker run -d --name ${r.name} ${r.image} && docker stop ${r.name}`,
      xp: 25,
      check: (ctx) => {
        const c = ctx.state.docker.containers.find((c) => c.name === r.name);
        return !!c && c.status === 'Exited';
      },
    });
    drills.push({
      id: `p-docker-logs-${i}`,
      difficulty: 2,
      prompt: `Запусти контейнер ${r.name} з образу ${r.image} і перевір його логи.`,
      hint: `docker run -d --name ${r.name} ${r.image} && docker logs ${r.name}`,
      solution: `docker run -d --name ${r.name} ${r.image} && docker logs ${r.name}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, r.name),
    });
  });

  drills.push({
    id: 'p-docker-images',
    difficulty: 1,
    prompt: 'Переглянь список локальних Docker-образів.',
    hint: 'docker images',
    solution: 'docker images',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'REPOSITORY'),
  });
  drills.push({
    id: 'p-docker-ps-empty',
    difficulty: 1,
    prompt: 'Перевір, чи є зараз запущені контейнери.',
    hint: 'docker ps',
    solution: 'docker ps',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'CONTAINER ID'),
  });

  const BUILD_TAGS = ['myapp:1.0', 'api-service:latest', 'worker:2.1'];
  BUILD_TAGS.forEach((tag, i) => {
    drills.push({
      id: `p-docker-build-${i}`,
      difficulty: 2,
      prompt: `Збери образ із тегом ${tag} (припустимо, Dockerfile у поточній директорії).`,
      hint: `docker build -t ${tag} .`,
      solution: `docker build -t ${tag} .`,
      xp: 20,
      check: (ctx) => {
        const [repo, t] = tag.split(':');
        return ctx.state.docker.images.some((im) => im.repo === repo && im.tag === t);
      },
    });
  });

  drills.push({
    id: 'p-docker-pull',
    difficulty: 1,
    prompt: 'Завантаж образ redis:7 з реєстру.',
    hint: 'docker pull redis:7',
    solution: 'docker pull redis:7',
    xp: 15,
    check: (ctx) => ctx.state.docker.images.some((im) => im.repo === 'redis' && im.tag === '7'),
  });

  drills.push({
    id: 'p-docker-compose-up',
    difficulty: 2,
    prompt: 'Запусти всі сервіси, описані в docker-compose.yml, одразу.',
    hint: 'docker-compose up',
    solution: 'docker-compose up',
    xp: 20,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'Starting services'),
  });
  drills.push({
    id: 'p-docker-compose-down',
    difficulty: 2,
    prompt: 'Зупини й прибери всі сервіси docker-compose.',
    hint: 'docker-compose down',
    solution: 'docker-compose down',
    xp: 20,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'Stopping services'),
  });

  return drills;
}

module.exports = { build };
