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

  drills.push({
    id: 'p-net-telnet-open',
    difficulty: 2,
    prompt: 'Перевір, чи відкритий порт 80 на api.internal, підключившись командою telnet.',
    hint: 'telnet api.internal 80',
    solution: 'telnet api.internal 80',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Connected to api.internal'),
  });
  drills.push({
    id: 'p-net-telnet-closed',
    difficulty: 2,
    prompt: 'Спробуй підключитись telnet-ом до порту 9999 на api.internal (порт закритий) і переконайся, що з\'єднання відхилено.',
    hint: 'telnet api.internal 9999',
    solution: 'telnet api.internal 9999',
    xp: 20,
    check: (ctx) => ctx.result.code === 1 && (ctx.result.stderr || '').includes('Connection refused'),
  });
  drills.push({
    id: 'p-net-tcpdump',
    difficulty: 2,
    prompt: 'Перехопи мережеві пакети на інтерфейсі eth0 (tcpdump).',
    hint: 'tcpdump -i eth0',
    solution: 'tcpdump -i eth0',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'listening on eth0'),
  });
  drills.push({
    id: 'p-net-ssh-port',
    difficulty: 2,
    prompt: 'Підключись по SSH до api.internal на нестандартному порту 2222.',
    hint: 'ssh -p 2222 api.internal',
    solution: 'ssh -p 2222 api.internal',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'port 2222'),
  });
  drills.push({
    id: 'p-net-scp-recursive',
    difficulty: 2,
    prompt: 'Скопіюй ЦІЛУ директорію projects на віддалений сервер api.internal у /tmp/ (рекурсивно).',
    hint: 'scp -r projects student@api.internal:/tmp/',
    solution: 'scp -r projects student@api.internal:/tmp/',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'projects') && h.stdoutIncludes(ctx.result, '100%'),
  });
  drills.push({
    id: 'p-net-df-inodes',
    difficulty: 2,
    prompt: 'Перевір використання inode (а не байтів) файлових систем.',
    hint: 'df -i',
    solution: 'df -i',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'IUse%'),
  });

  drills.push({
    id: 'p-net-ufw-enable',
    difficulty: 1,
    prompt: 'Увімкни файрвол ufw (типово вимкнений на свіжому Ubuntu).',
    hint: 'ufw enable',
    solution: 'ufw enable',
    xp: 15,
    check: (ctx) => ctx.state.ufw.active === true,
  });
  const UFW_PORTS = ['22', '80', '443'];
  UFW_PORTS.forEach((port, i) => {
    drills.push({
      id: `p-net-ufw-allow-${i}`,
      difficulty: 2,
      prompt: `Дозволь вхідні з'єднання на порт ${port} через ufw.`,
      hint: `ufw allow ${port}`,
      solution: `ufw allow ${port}`,
      xp: 20,
      check: (ctx) => ctx.state.ufw.rules.some((r) => r.port === port && r.action === 'ALLOW'),
    });
  });
  drills.push({
    id: 'p-net-ufw-deny',
    difficulty: 2,
    prompt: 'Заборони порт 23 (telnet — небезпечний, незашифрований) через ufw.',
    hint: 'ufw deny 23',
    solution: 'ufw deny 23',
    xp: 20,
    check: (ctx) => ctx.state.ufw.rules.some((r) => r.port === '23' && r.action === 'DENY'),
  });
  drills.push({
    id: 'p-net-ufw-status',
    difficulty: 2,
    prompt: "Увімкни ufw, дозволь порт 22, а потім перевір поточний стан і правила командою ufw status.",
    hint: 'ufw enable && ufw allow 22 && ufw status',
    solution: 'ufw enable && ufw allow 22 && ufw status',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Status: active') && h.stdoutIncludes(ctx.result, 'ALLOW'),
  });

  drills.push({
    id: 'p-net-firewalld-state',
    difficulty: 1,
    prompt: 'Перевір, чи запущений firewalld (RHEL/CentOS-файрвол — інший інструмент, ніж ufw).',
    hint: 'firewall-cmd --state',
    solution: 'firewall-cmd --state',
    xp: 15,
    check: (ctx) => h.stdoutTrim(ctx.result) === 'running',
  });
  const FIREWALLD_PORTS = ['8080/tcp', '5432/tcp', '9090/tcp'];
  FIREWALLD_PORTS.forEach((port, i) => {
    drills.push({
      id: `p-net-firewalld-addport-${i}`,
      difficulty: 2,
      prompt: `Дозволь порт ${port} через firewalld.`,
      hint: `firewall-cmd --add-port=${port}`,
      solution: `firewall-cmd --add-port=${port}`,
      xp: 20,
      check: (ctx) => ctx.state.firewalld.ports.includes(port),
    });
  });
  drills.push({
    id: 'p-net-firewalld-list-all',
    difficulty: 2,
    prompt: 'Дозволь порт 8080/tcp через firewalld, а потім перевір усі правила поточної зони командою --list-all.',
    hint: 'firewall-cmd --add-port=8080/tcp && firewall-cmd --list-all',
    solution: 'firewall-cmd --add-port=8080/tcp && firewall-cmd --list-all',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, '8080/tcp'),
  });

  return drills;
}

module.exports = { build };
