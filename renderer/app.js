'use strict';

const { Shell } = require('./shell/shell.js');
const lessons = require('./data/lessons/index.js');
const { ProgressStore, levelFromXp, xpForLevel, BADGES } = require('./progress.js');

const progress = new ProgressStore();

let currentLesson = null;
let currentShell = null;
let currentDrillIndex = 0;
let revealState = {}; // drillId -> 'hint' | 'solution'
let sessionXp = 0;

// ---------------- DOM refs ----------------

const $ = (id) => document.getElementById(id);

const el = {
  streakValue: $('streak-value'),
  levelValue: $('level-value'),
  xpBarFill: $('xp-bar-fill'),
  xpCaption: $('xp-caption'),
  lessonList: $('lesson-list'),
  badgesBtn: $('badges-btn'),
  welcomeScreen: $('welcome-screen'),
  lessonScreen: $('lesson-screen'),
  lessonCompleteScreen: $('lesson-complete-screen'),
  backBtn: $('back-btn'),
  completeBackBtn: $('complete-back-btn'),
  lessonProgressPill: $('lesson-progress-pill'),
  lessonIcon: $('lesson-icon'),
  lessonTitleText: $('lesson-title-text'),
  lessonDots: $('lesson-dots'),
  drillIndex: $('drill-index'),
  drillPrompt: $('drill-prompt'),
  drillHint: $('drill-hint'),
  hintBtn: $('hint-btn'),
  solutionBtn: $('solution-btn'),
  terminalTitle: $('terminal-title'),
  terminalBody: $('terminal-body'),
  terminalOutput: $('terminal-output'),
  promptText: $('prompt-text'),
  terminalInput: $('terminal-input'),
  successToast: $('success-toast'),
  successSub: $('success-sub'),
  nextBtn: $('next-btn'),
  lessonCompleteText: $('lesson-complete-text'),
  badgesModal: $('badges-modal'),
  badgesGrid: $('badges-grid'),
  badgesClose: $('badges-close'),
  toastStack: $('toast-stack'),
  appVersion: $('app-version'),
  updateCheckBtn: $('update-check-btn'),
  updateBanner: $('update-banner'),
  updateBannerText: $('update-banner-text'),
  updateInstallBtn: $('update-install-btn'),
};

// ---------------- Header stats ----------------

function renderHeader() {
  const xp = progress.data.xp;
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const fraction = next > start ? (xp - start) / (next - start) : 1;
  el.levelValue.textContent = 'Lvl ' + level;
  el.xpBarFill.style.width = Math.max(0, Math.min(1, fraction)) * 100 + '%';
  el.xpCaption.textContent = `${xp - start} / ${next - start} XP`;
  el.streakValue.textContent = String(progress.data.streak);
}

// ---------------- Sidebar ----------------

function renderSidebar() {
  el.lessonList.innerHTML = '';
  for (const lesson of lessons) {
    const done = progress.completedCountFor(lesson.id);
    const total = lesson.drills.length;
    const item = document.createElement('div');
    item.className = 'lesson-item' + (currentLesson && currentLesson.id === lesson.id ? ' active' : '') + (done === total ? ' done' : '');

    const icon = document.createElement('span');
    icon.className = 'lesson-item-icon';
    icon.textContent = lesson.icon;

    const body = document.createElement('div');
    body.className = 'lesson-item-body';
    const title = document.createElement('div');
    title.className = 'lesson-item-title';
    title.textContent = lesson.title;
    const barTrack = document.createElement('div');
    barTrack.className = 'lesson-item-progress';
    const barFill = document.createElement('div');
    barFill.className = 'lesson-item-progress-fill';
    barFill.style.width = (total ? (done / total) * 100 : 0) + '%';
    barTrack.appendChild(barFill);
    body.appendChild(title);
    body.appendChild(barTrack);

    const check = document.createElement('span');
    check.className = 'lesson-item-check';
    check.textContent = '✓';

    item.appendChild(icon);
    item.appendChild(body);
    item.appendChild(check);
    item.addEventListener('click', () => openLesson(lesson));
    el.lessonList.appendChild(item);
  }
}

// ---------------- Lesson session ----------------

function openLesson(lesson) {
  currentLesson = lesson;
  currentShell = new Shell();
  revealState = {};
  sessionXp = 0;

  // Reconstruct filesystem/session state by silently replaying the
  // canonical solution of every already-completed drill.
  let resumeIndex = 0;
  for (let i = 0; i < lesson.drills.length; i++) {
    const drill = lesson.drills[i];
    if (progress.isDrillCompleted(lesson.id, drill.id)) {
      if (!drill.quiz) currentShell.run(drill.solution, { record: false });
      resumeIndex = i + 1;
    } else {
      break;
    }
  }
  currentDrillIndex = Math.min(resumeIndex, lesson.drills.length - 1);

  renderSidebar();

  if (resumeIndex >= lesson.drills.length) {
    showLessonComplete(lesson, true);
    return;
  }

  el.welcomeScreen.classList.add('hidden');
  el.lessonCompleteScreen.classList.add('hidden');
  el.lessonScreen.classList.remove('hidden');

  el.lessonIcon.textContent = lesson.icon;
  el.lessonTitleText.textContent = lesson.title;
  el.terminalOutput.innerHTML = '';
  el.successToast.classList.add('hidden');

  renderDrill();
  el.terminalInput.focus();
}

function currentDrill() {
  return currentLesson.drills[currentDrillIndex];
}

function renderDrill() {
  const lesson = currentLesson;
  const drill = currentDrill();
  const done = progress.completedCountFor(lesson.id);
  const total = lesson.drills.length;

  el.lessonProgressPill.textContent = `${done} / ${total}`;
  el.drillIndex.textContent = `Завдання ${currentDrillIndex + 1} з ${total}`;
  el.drillPrompt.textContent = drill.prompt;
  el.drillHint.classList.add('hidden');
  el.drillHint.classList.remove('solution');
  el.drillHint.textContent = '';
  el.successToast.classList.add('hidden');

  el.lessonDots.innerHTML = '';
  lesson.drills.forEach((d, i) => {
    const dot = document.createElement('span');
    dot.className = 'lesson-dot';
    if (progress.isDrillCompleted(lesson.id, d.id)) dot.classList.add('done');
    if (i === currentDrillIndex) dot.classList.add('current');
    el.lessonDots.appendChild(dot);
  });

  updatePromptText();
  el.terminalInput.value = '';
  el.terminalInput.focus();
}

function updatePromptText() {
  const drill = currentDrill();
  if (drill && drill.quiz) {
    el.promptText.textContent = 'Відповідь>';
    el.terminalTitle.textContent = `питання — ${currentLesson.title}`;
    return;
  }
  const home = currentShell.fs.env.HOME;
  const cwd = currentShell.fs.cwd;
  const display = cwd === home ? '~' : cwd.startsWith(home + '/') ? '~' + cwd.slice(home.length) : cwd;
  const promptStr = `student@devops-trainer:${display}$`;
  el.promptText.textContent = promptStr;
  el.terminalTitle.textContent = `student@devops-trainer — ${currentLesson.title}`;
}

// ---------------- Terminal rendering ----------------

function appendLine(text, cls) {
  const line = document.createElement('div');
  line.className = cls;
  line.textContent = text;
  el.terminalOutput.appendChild(line);
  el.terminalBody.scrollTop = el.terminalBody.scrollHeight;
}

function appendCmdLine(text) {
  const line = document.createElement('div');
  line.className = 'term-line-cmd';
  const promptSpan = document.createElement('span');
  promptSpan.className = 'prompt-fragment';
  promptSpan.textContent = el.promptText.textContent + ' ';
  line.appendChild(promptSpan);
  line.appendChild(document.createTextNode(text));
  el.terminalOutput.appendChild(line);
  el.terminalBody.scrollTop = el.terminalBody.scrollHeight;
}

function appendBlock(text, cls) {
  if (!text) return;
  const clean = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (!clean) return;
  for (const l of clean.split('\n')) appendLine(l, cls);
}

// ---------------- Input submission ----------------

el.terminalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitInput();
});

function submitInput() {
  const raw = el.terminalInput.value;
  if (!raw.trim()) return;
  el.terminalInput.value = '';
  const drill = currentDrill();

  if (drill.quiz) {
    appendCmdLine(raw);
    const passed = safeCheck(drill, { shell: currentShell, fs: currentShell.fs, state: currentShell.state, result: null, input: raw });
    if (passed) {
      onDrillPassed(drill);
    } else {
      appendLine('# не зовсім так — спробуй ще раз', 'term-line-err');
    }
    return;
  }

  appendCmdLine(raw);
  const result = currentShell.run(raw);

  if (result.stdout.includes('\x1bCLEAR\x1b')) {
    el.terminalOutput.innerHTML = '';
    appendBlock(result.stdout.split('\x1bCLEAR\x1b').join(''), 'term-line-out');
  } else {
    appendBlock(result.stdout, 'term-line-out');
  }
  appendBlock(result.stderr, 'term-line-err');
  updatePromptText();

  const passed = safeCheck(drill, { shell: currentShell, fs: currentShell.fs, state: currentShell.state, result, input: raw });
  if (passed) onDrillPassed(drill);
}

function safeCheck(drill, ctx) {
  try {
    return !!drill.check(ctx);
  } catch (e) {
    console.error('drill check() threw', drill.id, e);
    return false;
  }
}

// ---------------- Drill completion ----------------

function onDrillPassed(drill) {
  const lessonId = currentLesson.id;
  const alreadyDone = progress.isDrillCompleted(lessonId, drill.id);

  let effectiveXp = drill.xp;
  if (revealState[drill.id] === 'solution') effectiveXp = Math.round(drill.xp * 0.3);
  else if (revealState[drill.id] === 'hint') effectiveXp = Math.round(drill.xp * 0.7);

  const outcome = progress.completeDrill(lessonId, drill.id, effectiveXp, lessons);
  progress.save();
  sessionXp += outcome.xpGained;

  renderHeader();
  renderSidebar();

  el.successSub.textContent = alreadyDone ? 'вже виконано раніше' : `+${outcome.xpGained} XP`;
  el.successToast.classList.remove('hidden');

  el.lessonDots.children[currentDrillIndex] && el.lessonDots.children[currentDrillIndex].classList.add('done');
  el.lessonProgressPill.textContent = `${progress.completedCountFor(lessonId)} / ${currentLesson.drills.length}`;

  for (const badge of outcome.newBadges) {
    showToast(`${badge.icon} Нова відзнака: ${badge.title}`, badge.desc);
  }
  if (outcome.leveledUp) {
    showToast('⭐ Новий рівень!', `Ти досяг рівня ${outcome.newLevel}`);
  }
}

el.nextBtn.addEventListener('click', () => {
  currentDrillIndex++;
  if (currentDrillIndex >= currentLesson.drills.length) {
    showLessonComplete(currentLesson, false);
  } else {
    renderDrill();
  }
});

function showLessonComplete(lesson, alreadyKnew) {
  el.lessonScreen.classList.add('hidden');
  el.welcomeScreen.classList.add('hidden');
  el.lessonCompleteScreen.classList.remove('hidden');
  el.lessonCompleteText.textContent = alreadyKnew
    ? `Ти вже пройшов урок «${lesson.title}» повністю. Можеш обрати інший урок зліва.`
    : `Ти успішно пройшов урок «${lesson.title}» і отримав ${sessionXp} XP за цю сесію.`;
  renderSidebar();
}

// ---------------- Hint / Solution ----------------

el.hintBtn.addEventListener('click', () => {
  const drill = currentDrill();
  if (!revealState[drill.id]) revealState[drill.id] = 'hint';
  el.drillHint.textContent = '💡 ' + drill.hint;
  el.drillHint.classList.remove('hidden', 'solution');
  el.terminalInput.focus();
});

el.solutionBtn.addEventListener('click', () => {
  const drill = currentDrill();
  revealState[drill.id] = 'solution';
  el.drillHint.textContent = drill.quiz ? drill.solution : '$ ' + drill.solution;
  el.drillHint.classList.remove('hidden');
  el.drillHint.classList.add('solution');
  el.terminalInput.focus();
});

// ---------------- Navigation ----------------

el.backBtn.addEventListener('click', () => backToLessons());
el.completeBackBtn.addEventListener('click', () => backToLessons());

function backToLessons() {
  currentLesson = null;
  el.lessonScreen.classList.add('hidden');
  el.lessonCompleteScreen.classList.add('hidden');
  el.welcomeScreen.classList.remove('hidden');
  renderSidebar();
}

// ---------------- Badges modal ----------------

el.badgesBtn.addEventListener('click', () => {
  el.badgesGrid.innerHTML = '';
  for (const badge of BADGES) {
    const earned = progress.data.badges.includes(badge.id);
    const card = document.createElement('div');
    card.className = 'badge-card' + (earned ? ' earned' : '');
    const icon = document.createElement('div');
    icon.className = 'badge-icon';
    icon.textContent = badge.icon;
    const title = document.createElement('div');
    title.className = 'badge-title';
    title.textContent = badge.title;
    const desc = document.createElement('div');
    desc.className = 'badge-desc';
    desc.textContent = badge.desc;
    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(desc);
    el.badgesGrid.appendChild(card);
  }
  el.badgesModal.classList.remove('hidden');
});
el.badgesClose.addEventListener('click', () => el.badgesModal.classList.add('hidden'));
el.badgesModal.addEventListener('click', (e) => {
  if (e.target === el.badgesModal) el.badgesModal.classList.add('hidden');
});

// ---------------- Toasts ----------------

function showToast(title, body) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  const t = document.createElement('div');
  t.className = 'toast-title';
  t.textContent = title;
  const b = document.createElement('div');
  b.className = 'toast-body';
  b.textContent = body;
  toast.appendChild(t);
  toast.appendChild(b);
  el.toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

// ---------------- Boot ----------------

// ---------------------------------------------------------------------
// Auto-update UI (electron-updater, wired via IPC from main.js)
// ---------------------------------------------------------------------

function setupUpdater() {
  let ipcRenderer = null;
  try {
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (e) {
    el.updateCheckBtn.disabled = true;
    return;
  }

  ipcRenderer.invoke('updater:getVersion').then((v) => {
    el.appVersion.textContent = 'v' + v;
  });

  el.updateCheckBtn.addEventListener('click', () => {
    el.updateCheckBtn.disabled = true;
    el.updateCheckBtn.textContent = 'Перевіряю…';
    ipcRenderer.invoke('updater:check');
    setTimeout(() => {
      el.updateCheckBtn.disabled = false;
      el.updateCheckBtn.textContent = 'Перевірити оновлення';
    }, 3000);
  });

  el.updateInstallBtn.addEventListener('click', () => {
    ipcRenderer.invoke('updater:install');
  });

  ipcRenderer.on('updater:state', (event, state) => {
    if (state.status === 'downloading') {
      el.updateBanner.classList.remove('hidden');
      el.updateInstallBtn.classList.add('hidden');
      const pct = state.progress ? Math.round(state.progress.percent) : 0;
      const version = state.info ? state.info.version : '';
      el.updateBannerText.innerHTML = '';
      el.updateBannerText.append(`Завантажується оновлення ${version ? 'v' + version : ''}… ${pct}%`);
    } else if (state.status === 'ready') {
      el.updateBanner.classList.remove('hidden');
      el.updateInstallBtn.classList.remove('hidden');
      const version = state.info ? state.info.version : '';
      el.updateBannerText.textContent = `Оновлення ${version ? 'v' + version + ' ' : ''}завантажено і готове до встановлення.`;
    } else if (state.status === 'up-to-date') {
      showToast('✅ Оновлень немає', 'У тебе вже остання версія.');
      el.updateBanner.classList.add('hidden');
    } else if (state.status === 'dev-mode') {
      showToast('ℹ️ Режим розробки', 'Автооновлення працює лише у зібраній версії (npm run dist).');
    } else if (state.status === 'error') {
      showToast('⚠️ Помилка оновлення', state.error || 'Не вдалося перевірити оновлення.');
    }
  });
}

async function boot() {
  await progress.load();
  renderHeader();
  renderSidebar();
  setupUpdater();
}

boot();
