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

  RUNS.forEach((r, i) => {
    drills.push({
      id: `p-docker-start-${i}`,
      difficulty: 2,
      prompt: `Запусти контейнер ${r.name} з образу ${r.image}, зупини його, а потім запусти знову командою docker start.`,
      hint: `docker run -d --name ${r.name} ${r.image} && docker stop ${r.name} && docker start ${r.name}`,
      solution: `docker run -d --name ${r.name} ${r.image} && docker stop ${r.name} && docker start ${r.name}`,
      xp: 25,
      check: (ctx) => {
        const c = ctx.state.docker.containers.find((c) => c.name === r.name);
        return !!c && c.status === 'Up';
      },
    });
  });
  RUNS.forEach((r, i) => {
    drills.push({
      id: `p-docker-restart-${i}`,
      difficulty: 2,
      prompt: `Запусти контейнер ${r.name} з образу ${r.image} і перезапусти його командою docker restart.`,
      hint: `docker run -d --name ${r.name} ${r.image} && docker restart ${r.name}`,
      solution: `docker run -d --name ${r.name} ${r.image} && docker restart ${r.name}`,
      xp: 25,
      check: (ctx) => {
        const c = ctx.state.docker.containers.find((c) => c.name === r.name);
        return !!c && c.status === 'Up';
      },
    });
  });
  RUNS.forEach((r, i) => {
    drills.push({
      id: `p-docker-rm-force-${i}`,
      difficulty: 3,
      prompt: `Запусти контейнер ${r.name} з образу ${r.image} і примусово видали його (навіть без зупинки) командою docker rm -f.`,
      hint: `docker run -d --name ${r.name} ${r.image} && docker rm -f ${r.name}`,
      solution: `docker run -d --name ${r.name} ${r.image} && docker rm -f ${r.name}`,
      xp: 25,
      check: (ctx) => !ctx.state.docker.containers.some((c) => c.name === r.name),
    });
  });
  drills.push({
    id: 'p-docker-rm-running-fails',
    difficulty: 2,
    prompt: 'Запусти контейнер web з образу nginx і спробуй видалити його без -f — переконайся, що docker rm відмовляє (контейнер запущений).',
    hint: 'docker run -d --name web nginx && docker rm web',
    solution: 'docker run -d --name web nginx && docker rm web',
    xp: 20,
    check: (ctx) => (ctx.result.stderr || '').includes('cannot remove a running container'),
  });
  RUNS.forEach((r, i) => {
    drills.push({
      id: `p-docker-inspect-${i}`,
      difficulty: 2,
      prompt: `Запусти контейнер ${r.name} з образу ${r.image} і подивись деталі про нього командою docker inspect.`,
      hint: `docker run -d --name ${r.name} ${r.image} && docker inspect ${r.name}`,
      solution: `docker run -d --name ${r.name} ${r.image} && docker inspect ${r.name}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, '"Name"'),
    });
  });

  const RMI_IMAGES = ['redis:7', 'python:3.12', 'postgres:16'];
  RMI_IMAGES.forEach((img, i) => {
    drills.push({
      id: `p-docker-rmi-${i}`,
      difficulty: 2,
      prompt: `Завантаж образ ${img} з реєстру, а потім видали його зі списку локальних образів.`,
      hint: `docker pull ${img} && docker rmi ${img}`,
      solution: `docker pull ${img} && docker rmi ${img}`,
      xp: 20,
      check: (ctx) => {
        const [repo, tag] = img.split(':');
        return !ctx.state.docker.images.some((im) => im.repo === repo && im.tag === tag);
      },
    });
  });
  drills.push({
    id: 'p-docker-rmi-in-use-fails',
    difficulty: 3,
    prompt: 'Запусти контейнер web з образу nginx і спробуй видалити образ nginx без -f — переконайся, що docker rmi відмовляє (образ використовується).',
    hint: 'docker run -d --name web nginx && docker rmi nginx',
    solution: 'docker run -d --name web nginx && docker rmi nginx',
    xp: 25,
    check: (ctx) => (ctx.result.stderr || '').includes('is using its referenced image'),
  });

  const TAG_TARGETS = [
    { source: 'nginx:latest', target: 'myrepo/nginx:v1' },
    { source: 'node:20-alpine', target: 'myrepo/api:1.0' },
    { source: 'nginx:latest', target: 'registry.internal/web:stable' },
  ];
  TAG_TARGETS.forEach(({ source, target }, i) => {
    drills.push({
      id: `p-docker-tag-${i}`,
      difficulty: 2,
      prompt: `Познач образ ${source} новим тегом ${target} (не видаляючи оригінал).`,
      hint: `docker tag ${source} ${target}`,
      solution: `docker tag ${source} ${target}`,
      xp: 25,
      check: (ctx) => {
        const [repo, tag] = target.split(':');
        const [srcRepo, srcTag] = source.split(':');
        return (
          ctx.state.docker.images.some((im) => im.repo === repo && im.tag === tag) &&
          ctx.state.docker.images.some((im) => im.repo === srcRepo && im.tag === srcTag)
        );
      },
    });
  });
  drills.push({
    id: 'p-docker-push-1',
    difficulty: 3,
    prompt: 'Познач образ nginx:latest тегом myrepo/nginx:v1 і завантаж його у віддалений реєстр.',
    hint: 'docker tag nginx:latest myrepo/nginx:v1 && docker push myrepo/nginx:v1',
    solution: 'docker tag nginx:latest myrepo/nginx:v1 && docker push myrepo/nginx:v1',
    xp: 30,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'digest'),
  });
  drills.push({
    id: 'p-docker-push-2',
    difficulty: 3,
    prompt: 'Познач образ node:20-alpine тегом myrepo/api:1.0 і завантаж його у віддалений реєстр.',
    hint: 'docker tag node:20-alpine myrepo/api:1.0 && docker push myrepo/api:1.0',
    solution: 'docker tag node:20-alpine myrepo/api:1.0 && docker push myrepo/api:1.0',
    xp: 30,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'digest'),
  });
  drills.push({
    id: 'p-docker-push-not-tagged-fails',
    difficulty: 2,
    prompt: 'Спробуй завантажити у реєстр образ myrepo/ghost:1.0, який ще не існує локально, і зверни увагу на помилку.',
    hint: 'docker push myrepo/ghost:1.0',
    solution: 'docker push myrepo/ghost:1.0',
    xp: 15,
    check: (ctx) => (ctx.result.stderr || '').includes('does not exist locally'),
  });

  const NETWORK_NAMES = ['app-net', 'backend-net', 'db-net'];
  NETWORK_NAMES.forEach((name, i) => {
    drills.push({
      id: `p-docker-network-create-${i}`,
      difficulty: 2,
      prompt: `Створи нову Docker-мережу з ім'ям ${name}.`,
      hint: `docker network create ${name}`,
      solution: `docker network create ${name}`,
      xp: 20,
      check: (ctx) => ctx.state.docker.networks.some((n) => n.name === name),
    });
  });
  drills.push({
    id: 'p-docker-network-ls',
    difficulty: 1,
    prompt: 'Переглянь список Docker-мереж.',
    hint: 'docker network ls',
    solution: 'docker network ls',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'bridge'),
  });
  drills.push({
    id: 'p-docker-network-duplicate-fails',
    difficulty: 2,
    prompt: 'Створи мережу mynet, а потім спробуй створити мережу з такою ж назвою ще раз і зверни увагу на помилку.',
    hint: 'docker network create mynet && docker network create mynet',
    solution: 'docker network create mynet && docker network create mynet',
    xp: 20,
    check: (ctx) => (ctx.result.stderr || '').includes('already exists'),
  });

  const VOLUME_NAMES = ['db-data', 'cache-data', 'logs-data'];
  VOLUME_NAMES.forEach((name, i) => {
    drills.push({
      id: `p-docker-volume-create-${i}`,
      difficulty: 2,
      prompt: `Створи новий Docker-том з ім'ям ${name}.`,
      hint: `docker volume create ${name}`,
      solution: `docker volume create ${name}`,
      xp: 20,
      check: (ctx) => ctx.state.docker.volumes.some((v) => v.name === name),
    });
  });
  drills.push({
    id: 'p-docker-volume-ls',
    difficulty: 2,
    prompt: 'Створи том cache-data, а потім переглянь список усіх томів.',
    hint: 'docker volume create cache-data && docker volume ls',
    solution: 'docker volume create cache-data && docker volume ls',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'cache-data'),
  });

  return drills;
}

module.exports = { build };
