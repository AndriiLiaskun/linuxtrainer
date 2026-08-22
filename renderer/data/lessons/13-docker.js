'use strict';
const h = require('./helpers');

module.exports = {
  id: 'docker',
  title: 'Docker основи',
  icon: '🐳',
  description: 'images, run, ps, logs — контейнеризація застосунків.',
  drills: [
    {
      id: 'docker-1',
      prompt: 'Переглянь список доступних локально Docker-образів.',
      hint: 'docker images',
      solution: 'docker images',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'nginx') && h.stdoutIncludes(ctx.result, 'REPOSITORY'),
    },
    {
      id: 'docker-2',
      prompt: 'Запусти контейнер з образу nginx у фоновому режимі з ім\'ям web.',
      hint: 'docker run -d --name <ім\'я> <образ>',
      solution: 'docker run -d --name web nginx',
      xp: 20,
      check: (ctx) => ctx.state.docker.containers.some((c) => c.name === 'web' && c.image === 'nginx' && c.status === 'Up'),
    },
    {
      id: 'docker-3',
      prompt: 'Переглянь список запущених контейнерів.',
      hint: 'docker ps',
      solution: 'docker ps',
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, 'web'),
    },
    {
      id: 'docker-4',
      prompt: 'Переглянь логи контейнера web.',
      hint: 'docker logs <контейнер>',
      solution: 'docker logs web',
      xp: 15,
      check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'web'),
    },
    {
      id: 'docker-5',
      prompt: 'Зупини контейнер web.',
      hint: 'docker stop <контейнер>',
      solution: 'docker stop web',
      xp: 15,
      check: (ctx) => {
        const c = ctx.state.docker.containers.find((c) => c.name === 'web');
        return !!c && c.status === 'Exited';
      },
    },
    {
      id: 'docker-6',
      prompt: 'Видали зупинений контейнер web.',
      hint: 'docker rm <контейнер>',
      solution: 'docker rm web',
      xp: 15,
      check: (ctx) => !ctx.state.docker.containers.some((c) => c.name === 'web'),
    },
    {
      id: 'docker-7',
      prompt: 'Збери новий образ з тегом myapp:latest (припустимо, Dockerfile вже готовий).',
      hint: 'docker build -t <тег> .',
      solution: 'docker build -t myapp:latest .',
      xp: 20,
      check: (ctx) => ctx.state.docker.images.some((i) => i.repo === 'myapp' && i.tag === 'latest'),
    },
  ],
};
