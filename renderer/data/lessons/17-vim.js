'use strict';
const h = require('./helpers');

module.exports = {
  id: 'vim',
  title: 'Редактор Vim',
  icon: '📝',
  description: 'i/Esc/:wq, gg/G/w/b, dd/x, yy/p — редагування файлів прямо в терміналі.',
  drills: [
    {
      id: 'vim-1',
      difficulty: 1,
      prompt: 'Створи новий файл greeting.txt у vim: відкрий редактор, натисни i (режим вставки), введи "Hello DevOps", натисни Esc, потім :wq і Enter, щоб зберегти й вийти.',
      hint: 'vim greeting.txt, далі: i → Hello DevOps → Esc → :wq → Enter',
      solution: 'vim greeting.txt   (i → Hello DevOps → Esc → :wq⏎)',
      xp: 25,
      vim: { path: 'greeting.txt', script: 'iHello DevOps<Esc>:wq<Enter>' },
      check: (ctx) => h.contentEquals(ctx.fs, '/home/student/greeting.txt', 'Hello DevOps\n'),
    },
    {
      id: 'vim-2',
      difficulty: 1,
      prompt: 'Відкрий у vim файл documents/notes.txt і просто вийди без змін командою :q (файл не змінено, тому це спрацює без помилок).',
      hint: 'vim documents/notes.txt → Esc → :q → Enter',
      solution: 'vim documents/notes.txt   (:q⏎)',
      xp: 15,
      vim: { path: 'documents/notes.txt', script: ':q<Enter>' },
      check: (ctx) => h.contentContains(ctx.fs, '/home/student/documents/notes.txt', 'TODO'),
    },
    {
      id: 'vim-3',
      difficulty: 2,
      prompt: 'Відкрий documents/notes.txt у vim, видали ПЕРШИЙ рядок командою dd, і збережи (:wq).',
      hint: 'vim documents/notes.txt → dd → :wq → Enter',
      solution: 'vim documents/notes.txt   (dd → :wq⏎)',
      xp: 25,
      vim: { path: 'documents/notes.txt', script: 'dd:wq<Enter>' },
      check: (ctx) => !h.contentContains(ctx.fs, '/home/student/documents/notes.txt', 'TODO'),
    },
    {
      id: 'vim-4',
      difficulty: 2,
      prompt: 'Відкрий documents/servers.txt у vim, скопіюй перший рядок (yy), встав його одразу під ним (p), і збережи. У файлі має з\'явитись дублікат першого сервера.',
      hint: 'vim documents/servers.txt → yy → p → :wq → Enter',
      solution: 'vim documents/servers.txt   (yy → p → :wq⏎)',
      xp: 30,
      vim: { path: 'documents/servers.txt', script: 'yyp:wq<Enter>' },
      check: (ctx) => {
        const n = ctx.fs.getNode('/home/student/documents/servers.txt');
        const lines = n.content.trim().split('\n');
        return lines[0] === 'web-01' && lines[1] === 'web-01';
      },
    },
    {
      id: 'vim-5',
      difficulty: 2,
      prompt: 'Відкрий greeting.txt (уже містить "Hello DevOps") у vim, перейди на початок файлу (gg), додай НОВИЙ рядок ПЕРЕД ним командою O, введи "Line before", і збережи.',
      hint: 'vim greeting.txt → gg → O → Line before → Esc → :wq → Enter',
      solution: 'vim greeting.txt   (gg → O → Line before → Esc → :wq⏎)',
      xp: 30,
      vim: { path: 'greeting.txt', script: 'ggOLine before<Esc>:wq<Enter>' },
      check: (ctx) => {
        const n = ctx.fs.getNode('/home/student/greeting.txt');
        const lines = n.content.split('\n');
        return lines[0] === 'Line before' && lines[1] === 'Hello DevOps';
      },
    },
    {
      id: 'vim-6',
      difficulty: 3,
      prompt: 'Відкрий greeting.txt у vim, перейди в кінець файлу (G), відкрий новий рядок під ним (o), введи "Line after", збережи.',
      hint: 'vim greeting.txt → G → o → Line after → Esc → :wq → Enter',
      solution: 'vim greeting.txt   (G → o → Line after → Esc → :wq⏎)',
      xp: 30,
      vim: { path: 'greeting.txt', script: 'GoLine after<Esc>:wq<Enter>' },
      check: (ctx) => {
        const n = ctx.fs.getNode('/home/student/greeting.txt');
        return n.content.trim().split('\n').pop() === 'Line after';
      },
    },
    {
      id: 'vim-7',
      difficulty: 3,
      prompt: 'Відкрий documents/inventory.csv у vim і видали ОДРАЗУ 2 рядки з початку файлу командою 2dd, потім збережи.',
      hint: 'vim documents/inventory.csv → 2dd → :wq → Enter',
      solution: 'vim documents/inventory.csv   (2dd → :wq⏎)',
      xp: 35,
      vim: { path: 'documents/inventory.csv', script: '2dd:wq<Enter>' },
      check: (ctx) => {
        const n = ctx.fs.getNode('/home/student/documents/inventory.csv');
        const lines = n.content.trim().split('\n');
        return lines.length === 4 && lines[0] === '2,monitor,4,180';
      },
    },
    {
      id: 'vim-8',
      difficulty: 3,
      prompt: 'Відкрий greeting.txt у vim, зроби якусь зміну (наприклад видали рядок через dd), а потім скасуй її командою u — і переконайся, що після :wq файл лишився БЕЗ змін.',
      hint: 'vim greeting.txt → dd → u → :wq → Enter',
      solution: 'vim greeting.txt   (dd → u → :wq⏎)',
      xp: 30,
      vim: { path: 'greeting.txt', script: 'ddu:wq<Enter>' },
      check: (ctx) => h.contentContains(ctx.fs, '/home/student/greeting.txt', 'Line before'),
    },
    {
      id: 'vim-9',
      difficulty: 1,
      prompt: 'Створи файл config.txt у vim з ДВОМА рядками: "port=8080" і "debug=false" (Enter між ними), і збережи.',
      hint: 'vim config.txt → i → port=8080 → Enter → debug=false → Esc → :wq → Enter',
      solution: 'vim config.txt   (i → port=8080⏎debug=false → Esc → :wq⏎)',
      xp: 25,
      vim: { path: 'config.txt', script: 'iport=8080<Enter>debug=false<Esc>:wq<Enter>' },
      check: (ctx) => h.contentEquals(ctx.fs, '/home/student/config.txt', 'port=8080\ndebug=false\n'),
    },
    {
      id: 'vim-10',
      difficulty: 2,
      prompt: 'Відкрий documents/notes.txt у vim, знайди слово "coffee" пошуком (/coffee, потім Enter — курсор стрибне прямо на цей рядок), видали цей рядок (dd), і збережи.',
      hint: 'vim documents/notes.txt → /coffee → Enter → dd → :wq → Enter',
      solution: 'vim documents/notes.txt   (/coffee⏎ → dd → :wq⏎)',
      xp: 30,
      vim: { path: 'documents/notes.txt', script: '/coffee<Enter>dd:wq<Enter>' },
      check: (ctx) => !h.contentContains(ctx.fs, '/home/student/documents/notes.txt', 'coffee'),
    },
    {
      id: 'vim-11',
      difficulty: 3,
      prompt: 'Створи новий файл search-demo.txt у vim з трьома рядками: web-01, web-02, db-01. Потім (не виходячи з vim) перейди на початок файлу (gg), знайди "web" (/web — курсор стрибне на web-02, бо пошук завжди йде ВІД курсора вперед, а не з нього самого), натисни n, щоб перейти до НАСТУПНОГО збігу (по колу поверне на web-01), видали САМЕ цей рядок (dd), і збережи.',
      hint: 'vim search-demo.txt → i → web-01⏎web-02⏎db-01 → Esc → gg → /web → Enter → n → dd → :wq → Enter',
      solution: 'vim search-demo.txt   (iweb-01⏎web-02⏎db-01 → Esc → gg → /web⏎ → n → dd → :wq⏎)',
      xp: 35,
      vim: { path: 'search-demo.txt', script: 'iweb-01<Enter>web-02<Enter>db-01<Esc>gg/web<Enter>ndd:wq<Enter>' },
      check: (ctx) => {
        const n = ctx.fs.getNode('/home/student/search-demo.txt');
        return !!n && !n.content.includes('web-01') && n.content.includes('web-02') && n.content.includes('db-01');
      },
    },
  ],
};
