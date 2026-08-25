'use strict';
const h = require('../helpers');

const KILLABLE = [
  { pid: 890, name: 'python3 app.py' },
  { pid: 1044, name: 'node server.js' },
  { pid: 343, name: 'nginx: worker process' },
];

const GREP_TARGETS = ['node', 'python3', 'nginx', 'sshd', 'bash'];

const DU_DIRS = ['projects', 'documents', 'projects/webapp'];

function build() {
  const drills = [];

  KILLABLE.forEach((p, i) => {
    drills.push({
      id: `p-proc-kill-${i}`,
      difficulty: 2,
      prompt: `Заверши процес "${p.name}" (PID ${p.pid}).`,
      hint: `kill ${p.pid}`,
      solution: `kill ${p.pid}`,
      xp: 20,
      check: (ctx) => !ctx.state.processes.some((proc) => proc.pid === p.pid),
    });
  });

  GREP_TARGETS.forEach((t, i) => {
    drills.push({
      id: `p-proc-grep-${i}`,
      difficulty: 2,
      prompt: `Знайди серед запущених процесів той, що містить "${t}" (скомбінуй ps і grep).`,
      hint: `ps aux | grep ${t}`,
      solution: `ps aux | grep ${t}`,
      xp: 20,
      check: (ctx) => h.stdoutIncludes(ctx.result, t),
    });
  });

  DU_DIRS.forEach((d, i) => {
    drills.push({
      id: `p-proc-du-${i}`,
      difficulty: 2,
      prompt: `Дізнайся розмір директорії ${d} у зручному для читання форматі.`,
      hint: `du -sh ${d}`,
      solution: `du -sh ${d}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, d),
    });
  });

  drills.push({
    id: 'p-proc-free',
    difficulty: 1,
    prompt: "Перевір пам'ять системи у зручному форматі.",
    hint: 'free -h',
    solution: 'free -h',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Mem:'),
  });
  drills.push({
    id: 'p-proc-df',
    difficulty: 1,
    prompt: 'Перевір використання дискового простору у зручному форматі.',
    hint: 'df -h',
    solution: 'df -h',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Filesystem'),
  });
  drills.push({
    id: 'p-proc-uptime',
    difficulty: 1,
    prompt: 'Перевір, скільки часу система працює без перезавантаження.',
    hint: 'uptime',
    solution: 'uptime',
    xp: 10,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'load average'),
  });
  drills.push({
    id: 'p-proc-ps-plain',
    difficulty: 1,
    prompt: 'Виведи короткий список процесів (без додаткових прапорців).',
    hint: 'ps',
    solution: 'ps',
    xp: 10,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'PID'),
  });
  drills.push({
    id: 'p-proc-whoami',
    difficulty: 1,
    prompt: "Дізнайся ім'я поточного користувача.",
    hint: 'whoami',
    solution: 'whoami',
    xp: 10,
    check: (ctx) => h.stdoutTrim(ctx.result) === 'student',
  });
  drills.push({
    id: 'p-proc-id',
    difficulty: 1,
    prompt: 'Дізнайся UID, GID та групи поточного користувача.',
    hint: 'id',
    solution: 'id',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'uid=') && h.stdoutIncludes(ctx.result, 'student'),
  });
  drills.push({
    id: 'p-proc-date',
    difficulty: 1,
    prompt: 'Перевір поточну дату й час системи.',
    hint: 'date',
    solution: 'date',
    xp: 10,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutTrim(ctx.result).length > 0,
  });
  drills.push({
    id: 'p-proc-top',
    difficulty: 2,
    prompt: 'Перевір, який процес найбільше навантажує CPU (знімок top).',
    hint: 'top',
    solution: 'top',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'PID') && h.stdoutIncludes(ctx.result, 'python3 app.py'),
  });
  drills.push({
    id: 'p-proc-htop',
    difficulty: 1,
    prompt: 'Відкрий інтерактивний перегляд процесів через htop.',
    hint: 'htop',
    solution: 'htop',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'PID'),
  });
  drills.push({
    id: 'p-proc-uname-a',
    difficulty: 1,
    prompt: "Дізнайся повну інформацію про ядро й систему (uname -a).",
    hint: 'uname -a',
    solution: 'uname -a',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Linux') && h.stdoutIncludes(ctx.result, 'x86_64'),
  });
  drills.push({
    id: 'p-proc-uname-r',
    difficulty: 1,
    prompt: 'Дізнайся лише версію ядра системи.',
    hint: 'uname -r',
    solution: 'uname -r',
    xp: 15,
    check: (ctx) => h.stdoutTrim(ctx.result).length > 0 && !h.stdoutIncludes(ctx.result, 'Linux devops-trainer'),
  });
  drills.push({
    id: 'p-proc-watch',
    difficulty: 2,
    prompt: 'Постав команду df -h на періодичне повторення (watch) з інтервалом 5 секунд.',
    hint: 'watch -n 5 df -h',
    solution: 'watch -n 5 df -h',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Every 5s') && h.stdoutIncludes(ctx.result, 'Filesystem'),
  });
  drills.push({
    id: 'p-proc-who',
    difficulty: 1,
    prompt: 'Перевір, які користувачі зараз залогінені в системі.',
    hint: 'who',
    solution: 'who',
    xp: 10,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'student'),
  });
  drills.push({
    id: 'p-proc-last',
    difficulty: 1,
    prompt: 'Перевір історію входів користувачів у систему.',
    hint: 'last',
    solution: 'last',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'still logged in'),
  });
  drills.push({
    id: 'p-proc-lsof',
    difficulty: 2,
    prompt: 'Перевір, які процеси тримають відкритими мережеві порти (lsof -i).',
    hint: 'lsof -i',
    solution: 'lsof -i',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'nginx') && h.stdoutIncludes(ctx.result, 'LISTEN'),
  });
  drills.push({
    id: 'p-proc-jobs-empty',
    difficulty: 1,
    prompt: 'Перевір, чи є зараз фонові завдання в цій сесії.',
    hint: 'jobs',
    solution: 'jobs',
    xp: 10,
    check: (ctx) => h.succeeded(ctx.result) && ctx.input.trim() === 'jobs',
  });

  const BG_COMMANDS = ['sleep 30', 'sleep 60', 'whoami', 'pwd'];
  BG_COMMANDS.forEach((cmd, i) => {
    drills.push({
      id: `p-proc-bg-${i}`,
      difficulty: 2,
      prompt: `Запусти команду "${cmd}" у фоновому режимі (символ &), а потім перевір список фонових завдань.`,
      hint: `${cmd} & jobs`,
      solution: `${cmd} & jobs`,
      xp: 25,
      check: (ctx) => h.stdoutIncludes(ctx.result, cmd) && ctx.state.backgroundJobs.length === 1,
    });
  });
  drills.push({
    id: 'p-proc-bg-multiple',
    difficulty: 3,
    prompt: 'Запусти дві різні команди у фоновому режимі одну за одною (sleep 10, потім whoami), а потім перевір, що в списку фонових завдань є обидві.',
    hint: 'sleep 10 & whoami & jobs',
    solution: 'sleep 10 & whoami & jobs',
    xp: 30,
    check: (ctx) => ctx.state.backgroundJobs.length === 2 && h.stdoutIncludes(ctx.result, 'sleep 10') && h.stdoutIncludes(ctx.result, 'whoami'),
  });
  drills.push({
    id: 'p-proc-killall-nginx',
    difficulty: 2,
    prompt: 'Заверши ВСІ процеси nginx одразу (і master, і worker) за іменем, не вказуючи PID.',
    hint: 'killall nginx',
    solution: 'killall nginx',
    xp: 25,
    check: (ctx) => !ctx.state.processes.some((p) => p.cmd.startsWith('nginx')),
  });
  drills.push({
    id: 'p-proc-pkill-python',
    difficulty: 2,
    prompt: 'Заверши процес python3 app.py за іменем (pkill), не вказуючи PID.',
    hint: 'pkill python3',
    solution: 'pkill python3',
    xp: 25,
    check: (ctx) => !ctx.state.processes.some((p) => p.pid === 890),
  });
  drills.push({
    id: 'p-proc-pmap-node',
    difficulty: 2,
    prompt: "Перевір карту пам'яті процесу node server.js (PID 1044).",
    hint: 'pmap 1044',
    solution: 'pmap 1044',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, '1044:') && h.stdoutIncludes(ctx.result, 'total'),
  });
  drills.push({
    id: 'p-proc-fg',
    difficulty: 2,
    prompt: 'Запусти команду sleep 20 у фоновому режимі, а потім виведи це завдання на передній план (fg).',
    hint: 'sleep 20 & fg',
    solution: 'sleep 20 & fg',
    xp: 25,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'sleep 20') && ctx.state.backgroundJobs.length === 0,
  });
  drills.push({
    id: 'p-proc-w',
    difficulty: 1,
    prompt: 'Перевір, хто зараз залогінений і яке навантаження системи (команда w).',
    hint: 'w',
    solution: 'w',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'load average'),
  });
  drills.push({
    id: 'p-proc-finger',
    difficulty: 1,
    prompt: "Перевір детальну інформацію про поточного користувача (finger).",
    hint: 'finger',
    solution: 'finger',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Login:') && h.stdoutIncludes(ctx.result, 'student'),
  });
  drills.push({
    id: 'p-proc-last-reboot',
    difficulty: 2,
    prompt: 'Перевір лише записи про перезавантаження системи (last reboot), без усієї історії входів.',
    hint: 'last reboot',
    solution: 'last reboot',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'reboot') && !h.stdoutIncludes(ctx.result, 'still logged in'),
  });
  drills.push({
    id: 'p-proc-hostname-i',
    difficulty: 2,
    prompt: "Перевір IP-адресу цього хосту (не ім'я, а адресу) командою hostname з відповідним прапорцем.",
    hint: 'hostname -i',
    solution: 'hostname -i',
    xp: 15,
    check: (ctx) => /^\d+\.\d+\.\d+\.\d+$/.test(h.stdoutTrim(ctx.result)),
  });
  drills.push({
    id: 'p-proc-cpuinfo',
    difficulty: 1,
    prompt: 'Перевір детальну інформацію про CPU системи через файл /proc/cpuinfo.',
    hint: 'cat /proc/cpuinfo',
    solution: 'cat /proc/cpuinfo',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'model name'),
  });
  drills.push({
    id: 'p-proc-meminfo',
    difficulty: 1,
    prompt: "Перевір детальну інформацію про пам'ять системи через файл /proc/meminfo.",
    hint: 'cat /proc/meminfo',
    solution: 'cat /proc/meminfo',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'MemTotal'),
  });
  drills.push({
    id: 'p-proc-meminfo-grep',
    difficulty: 2,
    prompt: 'Знайди лише рядок MemTotal у /proc/meminfo (без усього іншого виводу).',
    hint: 'grep MemTotal /proc/meminfo',
    solution: 'grep MemTotal /proc/meminfo',
    xp: 20,
    check: (ctx) => h.stdoutLines(ctx.result).length === 1 && h.stdoutIncludes(ctx.result, 'MemTotal'),
  });
  drills.push({
    id: 'p-proc-interrupts',
    difficulty: 2,
    prompt: 'Перевір статистику апаратних переривань (IRQ) через файл /proc/interrupts.',
    hint: 'cat /proc/interrupts',
    solution: 'cat /proc/interrupts',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'IO-APIC'),
  });
  drills.push({
    id: 'p-proc-uptime-raw',
    difficulty: 2,
    prompt: "Перевір сирі дані про час роботи системи (у секундах) через файл /proc/uptime (на відміну від зручного для читання виводу команди uptime).",
    hint: 'cat /proc/uptime',
    solution: 'cat /proc/uptime',
    xp: 15,
    check: (ctx) => /^\d+\.\d+ \d+\.\d+/.test(h.stdoutTrim(ctx.result)),
  });
  drills.push({
    id: 'p-proc-dmesg',
    difficulty: 1,
    prompt: 'Перевір повідомлення ядра (kernel ring buffer) командою dmesg.',
    hint: 'dmesg',
    solution: 'dmesg',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Linux version'),
  });
  drills.push({
    id: 'p-proc-lspci',
    difficulty: 1,
    prompt: 'Виведи список PCI-пристроїв системи.',
    hint: 'lspci',
    solution: 'lspci',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Ethernet controller'),
  });
  drills.push({
    id: 'p-proc-lsusb',
    difficulty: 1,
    prompt: 'Виведи список USB-пристроїв системи.',
    hint: 'lsusb',
    solution: 'lsusb',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Bus'),
  });
  drills.push({
    id: 'p-proc-lshal',
    difficulty: 1,
    prompt: 'Виведи список апаратних пристроїв через застарілий HAL-демон (lshal).',
    hint: 'lshal',
    solution: 'lshal',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'udi ='),
  });
  drills.push({
    id: 'p-proc-dmidecode',
    difficulty: 2,
    prompt: "Дізнайся виробника й модель заліза системи (dmidecode, тип 'system').",
    hint: 'dmidecode -t system',
    solution: 'dmidecode -t system',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Manufacturer'),
  });
  drills.push({
    id: 'p-proc-hdparm',
    difficulty: 2,
    prompt: 'Перевір швидкість читання диска /dev/sda командою hdparm.',
    hint: 'hdparm -t /dev/sda',
    solution: 'hdparm -t /dev/sda',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'MB/sec'),
  });
  drills.push({
    id: 'p-proc-badblocks',
    difficulty: 2,
    prompt: 'Проскануй диск /dev/sda1 на пошкоджені блоки командою badblocks.',
    hint: 'badblocks -sv /dev/sda1',
    solution: 'badblocks -sv /dev/sda1',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'bad blocks'),
  });
  drills.push({
    id: 'p-proc-fdisk',
    difficulty: 2,
    prompt: 'Виведи список дискових розділів системи (fdisk -l).',
    hint: 'fdisk -l',
    solution: 'fdisk -l',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, '/dev/sda1'),
  });
  drills.push({
    id: 'p-proc-mount',
    difficulty: 1,
    prompt: 'Перевір, які файлові системи зараз змонтовані.',
    hint: 'mount',
    solution: 'mount',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'type ext4'),
  });
  drills.push({
    id: 'p-proc-vmstat',
    difficulty: 2,
    prompt: "Перевір статистику пам'яті/CPU/I/O системи (vmstat).",
    hint: 'vmstat',
    solution: 'vmstat',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'procs'),
  });
  drills.push({
    id: 'p-proc-mpstat',
    difficulty: 2,
    prompt: 'Перевір детальну статистику навантаження CPU (mpstat).',
    hint: 'mpstat',
    solution: 'mpstat',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, '%idle'),
  });
  drills.push({
    id: 'p-proc-iostat',
    difficulty: 2,
    prompt: 'Перевір статистику вводу/виводу диска (iostat).',
    hint: 'iostat',
    solution: 'iostat',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Device'),
  });
  drills.push({
    id: 'p-proc-history',
    difficulty: 2,
    prompt: 'Виконай кілька команд (pwd, потім ls), а тоді перевір історію команд цієї сесії.',
    hint: 'pwd && ls && history',
    solution: 'pwd && ls && history',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'pwd') && h.stdoutIncludes(ctx.result, 'ls'),
  });

  return drills;
}

module.exports = { build };
