'use strict';

// Short reference shown when a command is clicked in the welcome-screen
// cheatsheet. Kept deliberately terse: one-line description + a handful of
// the most useful flags + one example. Not full man pages.
const COMMAND_DOCS = {
  pwd: { desc: 'Виводить поточну робочу директорію.', example: 'pwd' },
  cd: { desc: 'Переходить у вказану директорію.', opts: [['-', 'повернутись у попередню директорію'], ['~', 'домашня директорія']], example: 'cd projects' },
  ls: { desc: 'Виводить вміст директорії.', opts: [['-a', 'показати приховані файли'], ['-l', 'детальний список з правами'], ['-h', 'розміри у зручному форматі']], example: 'ls -la' },
  tree: { desc: 'Показує деревовидну структуру директорії.', opts: [['-a', 'включно з прихованими файлами']], example: 'tree projects' },

  touch: { desc: 'Створює порожній файл (або оновлює час зміни).', example: 'touch notes.txt' },
  mkdir: { desc: 'Створює нову директорію.', opts: [['-p', 'створити всі проміжні директорії']], example: 'mkdir -p a/b/c' },
  cp: { desc: 'Копіює файли або директорії.', opts: [['-r', 'рекурсивно (для директорій)']], example: 'cp -r src dest' },
  mv: { desc: 'Переміщує або перейменовує файл/директорію.', example: 'mv old.txt new.txt' },
  rm: { desc: 'Видаляє файли або директорії.', opts: [['-r', 'рекурсивно'], ['-f', 'без підтвердження/помилок']], example: 'rm -rf tmp/' },
  ln: { desc: 'Створює посилання на файл.', opts: [['-s', 'символьне (soft) посилання']], example: 'ln -s target link' },

  cat: { desc: 'Виводить весь вміст файлу.', opts: [['-n', 'з нумерацією рядків']], example: 'cat notes.txt' },
  head: { desc: 'Виводить перші N рядків файлу.', opts: [['-n K', 'кількість рядків (типово 10)']], example: 'head -n 5 app.log' },
  tail: { desc: 'Виводить останні N рядків файлу.', opts: [['-n K', 'кількість рядків'], ['-n +K', 'починаючи з рядка K']], example: 'tail -n 20 app.log' },
  wc: { desc: 'Рахує рядки/слова/символи.', opts: [['-l', 'лише рядки'], ['-w', 'лише слова']], example: 'wc -l file.txt' },
  less: { desc: 'Перегляд вмісту файлу посторінково (тут — як cat).', example: 'less app.log' },

  chmod: { desc: 'Змінює права доступу до файлу.', opts: [['755/644/…', 'числовий режим'], ['u+x, g-w…', 'символьний режим']], example: 'chmod 644 file.txt' },
  chown: { desc: 'Змінює власника (і групу) файлу.', opts: [['owner:group', 'встановити обидва одразу']], example: 'chown alice:devs file' },
  stat: { desc: 'Показує детальні метадані файлу (розмір, права, час зміни).', example: 'stat file.txt' },

  grep: { desc: 'Шукає рядки, що відповідають шаблону.', opts: [['-i', 'ігнорувати регістр'], ['-v', 'інвертувати (не містить)'], ['-n', 'з номерами рядків'], ['-r', 'рекурсивно по директорії']], example: 'grep -i error app.log' },
  find: { desc: 'Шукає файли за іменем/типом у дереві директорій.', opts: [['-name', 'шаблон імені'], ['-type f/d', 'файл чи директорія']], example: "find . -name '*.log'" },

  sed: { desc: 'Потоковий редактор — заміна тексту.', opts: [["s/from/to/", 'замінити перше входження'], ["s/from/to/g", 'замінити всі входження']], example: "sed 's/foo/bar/' file" },
  awk: { desc: 'Обробка тексту по стовпцях (полях).', opts: [['-F,', 'роздільник полів'], ['$1, $2…', 'номер поля']], example: "awk -F',' '{print $2}' data.csv" },
  sort: { desc: 'Сортує рядки.', opts: [['-n', 'числове сортування'], ['-r', 'у зворотному порядку'], ['-u', 'прибрати дублікати']], example: 'sort -n numbers.txt' },
  cut: { desc: 'Виділяє стовпці/поля з рядків.', opts: [['-d', 'роздільник'], ['-f', 'номер(и) поля через кому']], example: "cut -d',' -f1 data.csv" },
  tr: { desc: 'Заміна/видалення символів у потоці.', opts: [['-d', 'видалити символи'], ['-s', 'стиснути повтори']], example: "tr 'a-z' 'A-Z'" },
  xargs: { desc: 'Передає вивід попередньої команди як аргументи наступній.', example: "find . -name '*.log' | xargs grep ERROR" },

  export: { desc: 'Оголошує змінну оточення, доступну дочірнім процесам.', example: 'export APP_ENV=production' },
  for: { desc: 'Цикл: виконує команди для кожного елемента списку.', example: 'for i in 1 2 3; do echo $i; done' },
  if: { desc: 'Умовна конструкція.', example: 'if [ -f file ]; then echo yes; fi' },
  '$(...)': { desc: 'Підстановка команди — вставляє вивід команди в рядок.', example: 'echo "Path: $(pwd)"' },

  ps: { desc: 'Список запущених процесів.', opts: [['aux', 'усі процеси, детальний формат']], example: 'ps aux | grep node' },
  top: { desc: 'Знімок процесів, відсортованих за навантаженням CPU.', example: 'top' },
  kill: { desc: 'Надсилає сигнал процесу (типово завершення) за PID.', example: 'kill 1234' },
  jobs: { desc: 'Список фонових завдань поточної сесії.', example: 'jobs' },
  free: { desc: "Використання оперативної пам'яті.", opts: [['-h', 'у зручному для читання форматі']], example: 'free -h' },
  df: { desc: 'Використання дискового простору файлових систем.', opts: [['-h', 'у зручному для читання форматі']], example: 'df -h' },

  systemctl: { desc: 'Керування сервісами systemd.', opts: [['start/stop/restart', 'керування станом'], ['enable/disable', 'автозапуск'], ['status', 'поточний стан']], example: 'systemctl status nginx' },
  journalctl: { desc: 'Перегляд системних журналів (логів) systemd.', opts: [['-u', 'логи конкретного сервісу']], example: 'journalctl -u nginx' },

  ping: { desc: 'Перевіряє доступність хосту через ICMP.', opts: [['-c N', 'кількість пакетів']], example: 'ping -c 4 example.com' },
  curl: { desc: 'Виконує HTTP(S) запити з командного рядка.', opts: [['-X METHOD', 'HTTP-метод (GET/POST/…)'], ['-o file', 'зберегти відповідь у файл']], example: 'curl -X POST http://api/deploy' },
  ssh: { desc: "Захищене підключення до віддаленого сервера.", example: 'ssh user@host' },
  scp: { desc: 'Копіює файли між локальним і віддаленим сервером через SSH.', example: 'scp file.txt user@host:/tmp/' },
  dig: { desc: 'DNS-запит — дізнатись IP-адресу хосту.', example: 'dig example.com' },

  apt: { desc: 'Пакетний менеджер Debian/Ubuntu.', opts: [['install -y', 'встановити пакет'], ['remove', 'видалити пакет'], ['update', 'оновити список пакетів']], example: 'apt install -y nginx' },
  yum: { desc: 'Пакетний менеджер RHEL/CentOS (старіший).', example: 'yum install -y httpd' },
  dnf: { desc: 'Пакетний менеджер Fedora/RHEL 8+ (наступник yum).', example: 'dnf install -y vim' },

  'git:init': { desc: 'Ініціалізує новий git-репозиторій у поточній директорії.', example: 'git init' },
  'git:add': { desc: 'Додає файл(и) в область підготовлених змін (staging).', example: 'git add file.txt' },
  'git:commit': { desc: 'Зберігає підготовлені зміни як новий коміт.', opts: [['-m', 'повідомлення коміту']], example: 'git commit -m "Fix bug"' },
  'git:branch': { desc: 'Створює гілку або виводить список гілок.', example: 'git branch feature/login' },
  'git:log': { desc: 'Показує історію комітів.', opts: [['--oneline', 'компактний однорядковий формат']], example: 'git log --oneline' },

  'docker:run': { desc: 'Запускає контейнер з образу.', opts: [['-d', 'у фоновому режимі'], ['--name', "ім'я контейнера"]], example: 'docker run -d --name web nginx' },
  'docker:ps': { desc: 'Список запущених контейнерів.', opts: [['-a', 'разом із зупиненими']], example: 'docker ps' },
  'docker:logs': { desc: 'Виводить логи контейнера.', example: 'docker logs web' },
  'docker:build': { desc: 'Збирає образ з Dockerfile.', opts: [['-t', 'тег образу']], example: 'docker build -t myapp:1.0 .' },
  'docker:exec': { desc: 'Виконує команду всередині запущеного контейнера.', example: 'docker exec web ls' },

  'k8s:get': { desc: 'Виводить список ресурсів кластера (поди, деплойменти, сервіси…).', example: 'kubectl get pods' },
  'k8s:apply': { desc: 'Застосовує YAML-маніфест до кластера.', opts: [['-f', 'шлях до файлу маніфесту']], example: 'kubectl apply -f deployment.yaml' },
  'k8s:scale': { desc: 'Змінює кількість реплік деплойменту.', opts: [['--replicas=N', 'бажана кількість реплік']], example: 'kubectl scale deployment web --replicas=5' },
  'k8s:describe': { desc: 'Детальна інформація про конкретний ресурс.', example: 'kubectl describe pod web-abc123' },

  tar: { desc: 'Пакує/розпаковує архіви .tar.', opts: [['-c', 'створити архів'], ['-x', 'розпакувати'], ['-f', "ім'я файлу архіву"]], example: 'tar -cf backup.tar dir/' },
  gzip: { desc: 'Стискає файл у формат .gz.', opts: [['-k', 'залишити оригінал'], ['-d', 'розпакувати']], example: 'gzip -k file.txt' },
  zip: { desc: 'Створює .zip-архів.', opts: [['-r', 'рекурсивно (для директорій)']], example: 'zip -r archive.zip dir/' },

  crontab: { desc: 'Керує розкладом регулярних завдань.', opts: [['-l', 'показати поточний розклад']], example: 'crontab -l' },
};

module.exports = { COMMAND_DOCS };
