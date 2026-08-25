'use strict';
const h = require('../helpers');

const HOSTS = ['example.com', 'api.internal', 'db.internal', 'cache.internal', 'staging.example.com'];

function build() {
  const drills = [];

  HOSTS.forEach((host, i) => {
    drills.push({
      id: `p-net-ping-${i}`,
      difficulty: 1,
      prompt: `Перевір доступність хосту ${host} через ping (4 пакети).`,
      hint: `ping -c 4 ${host}`,
      solution: `ping -c 4 ${host}`,
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, `PING ${host}`),
    });
    drills.push({
      id: `p-net-dig-${i}`,
      difficulty: 2,
      prompt: `Дізнайся IP-адресу хосту ${host} через DNS-запит.`,
      hint: `dig ${host}`,
      solution: `dig ${host}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, host),
    });
  });

  const CURL_PATHS = ['/status', '/health', '/deploy', '/metrics'];
  CURL_PATHS.forEach((p, i) => {
    drills.push({
      id: `p-net-curl-get-${i}`,
      difficulty: 2,
      prompt: `Виконай GET-запит до http://api.internal${p}.`,
      hint: `curl http://api.internal${p}`,
      solution: `curl http://api.internal${p}`,
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, '"status": "ok"'),
    });
  });

  drills.push({
    id: 'p-net-curl-post',
    difficulty: 2,
    prompt: 'Виконай POST-запит до http://api.internal/deploy.',
    hint: 'curl -X POST http://api.internal/deploy',
    solution: 'curl -X POST http://api.internal/deploy',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, '"method": "POST"'),
  });
  drills.push({
    id: 'p-net-ss',
    difficulty: 2,
    prompt: 'Перевір, які TCP-порти зараз слухають на сервері.',
    hint: 'ss',
    solution: 'ss',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, '0.0.0.0:80'),
  });
  drills.push({
    id: 'p-net-hostname',
    difficulty: 1,
    prompt: "Дізнайся ім'я хосту (hostname) цього сервера.",
    hint: 'hostname',
    solution: 'hostname',
    xp: 10,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'devops-trainer'),
  });

  HOSTS.slice(0, 3).forEach((host, i) => {
    drills.push({
      id: `p-net-ssh-${i}`,
      difficulty: 1,
      prompt: `Підключись по SSH до сервера ${host}.`,
      hint: `ssh ${host}`,
      solution: `ssh ${host}`,
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, host),
    });
  });

  drills.push({
    id: 'p-net-netstat',
    difficulty: 1,
    prompt: 'Перевір мережеві з\'єднання та порти, що слухають, через netstat (застарілий інструмент, але й досі трапляється).',
    hint: 'netstat -tlnp',
    solution: 'netstat -tlnp',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'LISTEN'),
  });

  HOSTS.slice(0, 3).forEach((host, i) => {
    drills.push({
      id: `p-net-nslookup-${i}`,
      difficulty: 2,
      prompt: `Дізнайся IP-адресу хосту ${host} через nslookup (альтернатива dig).`,
      hint: `nslookup ${host}`,
      solution: `nslookup ${host}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, host),
    });
  });

  const WGET_URLS = ['http://example.com/readme.txt', 'http://api.internal/config.json'];
  WGET_URLS.forEach((url, i) => {
    const name = url.split('/').pop();
    drills.push({
      id: `p-net-wget-${i}`,
      difficulty: 2,
      prompt: `Завантаж файл за посиланням ${url} командою wget.`,
      hint: `wget ${url}`,
      solution: `wget ${url}`,
      xp: 20,
      check: (ctx) => h.isFile(ctx.fs, `/home/student/${name}`),
    });
  });

  drills.push({
    id: 'p-net-ip-addr',
    difficulty: 2,
    prompt: 'Переглянь IP-адреси мережевих інтерфейсів цього сервера.',
    hint: 'ip addr',
    solution: 'ip addr',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'eth0') && h.stdoutIncludes(ctx.result, 'inet'),
  });
  drills.push({
    id: 'p-net-ip-route',
    difficulty: 2,
    prompt: 'Переглянь таблицю маршрутизації сервера.',
    hint: 'ip route',
    solution: 'ip route',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'default via'),
  });

  const RSYNC_TARGETS = [
    { src: 'documents', dest: 'backup-docs' },
    { src: 'projects/webapp', dest: 'backup-webapp' },
  ];
  RSYNC_TARGETS.forEach(({ src, dest }, i) => {
    drills.push({
      id: `p-net-rsync-${i}`,
      difficulty: 2,
      prompt: `Синхронізуй директорію ${src} у ${dest} командою rsync (у режимі архіву, з докладним виводом).`,
      hint: `rsync -av ${src} ${dest}`,
      solution: `rsync -av ${src} ${dest}`,
      xp: 25,
      check: (ctx) => h.isDir(ctx.fs, `/home/student/${dest}`),
    });
  });

  HOSTS.slice(0, 3).forEach((host, i) => {
    drills.push({
      id: `p-net-traceroute-${i}`,
      difficulty: 2,
      prompt: `Прослідкуй маршрут пакетів до хосту ${host}.`,
      hint: `traceroute ${host}`,
      solution: `traceroute ${host}`,
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, `traceroute to ${host}`),
    });
  });

  return drills;
}

module.exports = { build };
