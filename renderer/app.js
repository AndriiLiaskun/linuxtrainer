'use strict';

const { Shell, REGISTRY } = require('./shell/shell.js');
const lessons = require('./data/lessons/index.js');
const { ProgressStore, levelFromXp, xpForLevel, BADGES } = require('./progress.js');
const { DIFFICULTY } = require('./data/difficulty.js');
const { feedbackFor, quizFeedbackFor } = require('./feedback.js');
const practiceEngine = require('./practiceEngine.js');
const vimEditor = require('./vimEditor.js');
const { CHEATSHEET } = require('./data/cheatsheet.js');
const { COMMAND_DOCS } = require('./data/commandDocs.js');
const { SHORTCUT_GROUPS } = require('./data/shortcuts.js');

const progress = new ProgressStore();

let currentLesson = null;
let currentShell = null;
let currentDrillIndex = 0;
let revealState = {}; // drillId -> 'hint' | 'solution'
let sessionXp = 0;
let attemptCounts = {}; // drillId -> number of failed tries since it was shown

let lessonMode = 'story'; // 'story' | 'practice'
let practiceStats = null; // current lesson's practiceEngine stats object
let currentPracticeDrill = null;
let vimState = null; // active vimEditor state, or null when the terminal is showing

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
  restartBtn: $('restart-btn'),
  lessonIcon: $('lesson-icon'),
  lessonTitleText: $('lesson-title-text'),
  lessonDots: $('lesson-dots'),
  modeBtnStory: $('mode-btn-story'),
  modeBtnPractice: $('mode-btn-practice'),
  practiceStats: $('practice-stats'),
  practiceTarget: $('practice-target'),
  practiceAccuracy: $('practice-accuracy'),
  practiceMastered: $('practice-mastered'),
  drillIndex: $('drill-index'),
  difficultyBadge: $('difficulty-badge'),
  drillPrompt: $('drill-prompt'),
  drillHint: $('drill-hint'),
  feedbackNote: $('feedback-note'),
  hintBtn: $('hint-btn'),
  solutionBtn: $('solution-btn'),
  terminalTitle: $('terminal-title'),
  terminalBody: $('terminal-body'),
  vimBody: $('vim-body'),
  vimFilename: $('vim-filename'),
  vimContent: $('vim-content'),
  vimStatusline: $('vim-statusline'),
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
  commandDocModal: $('command-doc-modal'),
  commandDocTitle: $('command-doc-title'),
  commandDocClose: $('command-doc-close'),
  commandDocDesc: $('command-doc-desc'),
  commandDocOpts: $('command-doc-opts'),
  commandDocExample: $('command-doc-example'),
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
  lessonMode = 'story';
  el.modeBtnStory.classList.add('active');
  el.modeBtnPractice.classList.remove('active');
  el.practiceStats.classList.add('hidden');
  el.lessonDots.classList.remove('hidden');
  el.restartBtn.classList.remove('hidden');
  el.lessonProgressPill.classList.remove('hidden');
  el.modeBtnPractice.disabled = !(lesson.practice && lesson.practice.length);

  // Reconstruct filesystem/session state by silently replaying the
  // canonical solution of every already-completed drill.
  let resumeIndex = 0;
  for (let i = 0; i < lesson.drills.length; i++) {
    const drill = lesson.drills[i];
    if (progress.isDrillCompleted(lesson.id, drill.id)) {
      if (drill.vim) {
        vimEditor.runVimScript(currentShell, drill.vim.path, drill.vim.script);
      } else if (!drill.quiz) {
        currentShell.run(drill.solution, { record: false });
      }
      resumeIndex = i + 1;
    } else {
      break;
    }
  }
  currentDrillIndex = Math.min(resumeIndex, lesson.drills.length - 1);

  renderSidebar();

  el.welcomeScreen.classList.add('hidden');
  el.lessonCompleteScreen.classList.add('hidden');
  el.lessonScreen.classList.remove('hidden');

  el.lessonIcon.textContent = lesson.icon;
  el.lessonTitleText.textContent = lesson.title;
  el.terminalOutput.innerHTML = '';
  el.successToast.classList.add('hidden');

  if (resumeIndex >= lesson.drills.length) {
    if (lesson.practice && lesson.practice.length) {
      switchMode('practice');
    } else {
      showLessonComplete(lesson, true);
    }
    return;
  }

  renderDrill();
  el.terminalInput.focus();
}

function currentDrill() {
  return lessonMode === 'practice' ? currentPracticeDrill : currentLesson.drills[currentDrillIndex];
}

function renderDifficultyBadge(drill) {
  const diff = DIFFICULTY[drill.difficulty] || DIFFICULTY[1];
  el.difficultyBadge.textContent = diff.stars + ' ' + diff.label;
  el.difficultyBadge.style.color = diff.color;
  el.difficultyBadge.style.background = diff.color + '1a';
  el.difficultyBadge.style.border = '1px solid ' + diff.color + '55';
}

function resetDrillCardChrome(drill) {
  if (vimState) {
    vimState = null;
    el.vimBody.classList.add('hidden');
    el.terminalBody.classList.remove('vim-capturing');
  }
  el.drillPrompt.textContent = drill.prompt;
  el.drillHint.classList.add('hidden');
  el.drillHint.classList.remove('solution');
  el.drillHint.textContent = '';
  el.successToast.classList.add('hidden');
  el.feedbackNote.classList.add('hidden');
  attemptCounts[drill.id] = 0;
  renderDifficultyBadge(drill);
  el.terminalInput.value = '';
  el.terminalInput.focus();
  resetHistoryNav();
}

function renderDrill() {
  const lesson = currentLesson;
  const drill = currentDrill();
  const done = progress.completedCountFor(lesson.id);
  const total = lesson.drills.length;

  el.lessonProgressPill.textContent = `${done} / ${total}`;
  el.drillIndex.textContent = `Завдання ${currentDrillIndex + 1} з ${total}`;
  el.terminalOutput.innerHTML = '';
  resetDrillCardChrome(drill);

  el.lessonDots.innerHTML = '';
  lesson.drills.forEach((d, i) => {
    const dot = document.createElement('span');
    dot.className = 'lesson-dot';
    if (progress.isDrillCompleted(lesson.id, d.id)) dot.classList.add('done');
    if (i === currentDrillIndex) dot.classList.add('current');
    el.lessonDots.appendChild(dot);
  });

  updatePromptText();
}

// ---------------- Practice mode (adaptive, endless drill pool) ----------------

function switchMode(mode) {
  if (mode === lessonMode) return;
  lessonMode = mode;
  el.modeBtnStory.classList.toggle('active', mode === 'story');
  el.modeBtnPractice.classList.toggle('active', mode === 'practice');
  el.lessonDots.classList.toggle('hidden', mode === 'practice');
  el.practiceStats.classList.toggle('hidden', mode !== 'practice');
  el.restartBtn.classList.toggle('hidden', mode === 'practice');
  el.lessonProgressPill.classList.toggle('hidden', mode === 'practice');

  if (mode === 'practice') {
    practiceStats = progress.getPracticeStats(currentLesson.id);
    nextPracticeDrill();
  } else {
    currentShell = new Shell();
    renderDrill();
  }
}

el.modeBtnStory.addEventListener('click', () => switchMode('story'));
el.modeBtnPractice.addEventListener('click', () => switchMode('practice'));

function nextPracticeDrill() {
  const pool = currentLesson.practice || [];
  currentPracticeDrill = practiceEngine.pickNext(pool, practiceStats);
  currentShell = new Shell();
  el.terminalOutput.innerHTML = '';

  if (!currentPracticeDrill) {
    el.drillIndex.textContent = 'Практика';
    el.drillPrompt.textContent = 'Для цього уроку ще немає банку практики.';
    el.difficultyBadge.textContent = '';
    updatePromptText();
    renderPracticeStats();
    return;
  }

  el.drillIndex.textContent = 'Практика · нескінченний режим';
  resetDrillCardChrome(currentPracticeDrill);
  updatePromptText();
  renderPracticeStats();
}

function renderPracticeStats() {
  const target = DIFFICULTY[practiceStats.targetDifficulty] || DIFFICULTY[1];
  el.practiceTarget.textContent = 'Рівень: ' + target.stars + ' ' + target.short;
  const acc = practiceEngine.sessionAccuracy(practiceStats);
  const seen = Object.values(practiceStats.drillStats).reduce((s, d) => s + d.seen, 0);
  el.practiceAccuracy.textContent = seen ? `Точність: ${Math.round(acc * 100)}%` : 'Точність: —';
  const pool = currentLesson.practice || [];
  el.practiceMastered.textContent = `Освоєно: ${practiceEngine.masteredCount(pool, practiceStats)} / ${pool.length}`;
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

let historyIndex = -1;
let historyDraft = '';

function resetHistoryNav() {
  historyIndex = -1;
  historyDraft = '';
}

el.terminalInput.addEventListener('keydown', (e) => {
  if (vimState) {
    e.preventDefault();
    handleVimKeydown(e.key, e.ctrlKey);
    return;
  }
  if (e.key === 'Enter') {
    resetHistoryNav();
    submitInput();
    return;
  }
  if (e.key === 'ArrowUp') {
    const drill = currentDrill();
    if (!drill || drill.quiz || !currentShell) return;
    const history = currentShell.state.history;
    if (!history.length) return;
    e.preventDefault();
    if (historyIndex === -1) {
      historyDraft = el.terminalInput.value;
      historyIndex = history.length - 1;
    } else if (historyIndex > 0) {
      historyIndex--;
    }
    el.terminalInput.value = history[historyIndex];
    const len = el.terminalInput.value.length;
    el.terminalInput.setSelectionRange(len, len);
    return;
  }
  if (e.key === 'ArrowDown') {
    if (historyIndex === -1) return;
    e.preventDefault();
    const history = currentShell.state.history;
    historyIndex++;
    if (historyIndex >= history.length) {
      historyIndex = -1;
      el.terminalInput.value = historyDraft;
    } else {
      el.terminalInput.value = history[historyIndex];
    }
    const len = el.terminalInput.value.length;
    el.terminalInput.setSelectionRange(len, len);
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    applyTabCompletion();
    return;
  }
  if (e.key === 'l' && e.ctrlKey) {
    e.preventDefault();
    el.terminalOutput.innerHTML = '';
    return;
  }
});

// ---------------- Tab completion ----------------

function applyTabCompletion() {
  const drill = currentDrill();
  if (!drill || drill.quiz || !currentShell) return;
  const text = el.terminalInput.value;
  const upToCaret = text.slice(0, el.terminalInput.selectionStart);
  const parts = upToCaret.split(' ');
  const lastWord = parts[parts.length - 1];
  const isCommandPosition = parts.length === 1;

  let candidates = [];
  let replacement = null;

  if (isCommandPosition) {
    candidates = Object.keys(REGISTRY).filter((name) => name.startsWith(lastWord)).sort();
  } else {
    const slashIdx = lastWord.lastIndexOf('/');
    const dirPart = slashIdx === -1 ? '' : lastWord.slice(0, slashIdx + 1);
    const prefix = slashIdx === -1 ? lastWord : lastWord.slice(slashIdx + 1);
    const lookupDir = dirPart === '' ? currentShell.fs.cwd : dirPart;
    let node;
    try {
      node = currentShell.fs.getNode(lookupDir);
    } catch (e) {
      node = null;
    }
    if (node && node.type === 'dir') {
      const names = Array.from(node.children.keys())
        .filter((n) => n.startsWith(prefix) && (prefix.startsWith('.') || !n.startsWith('.')))
        .sort();
      candidates = names.map((n) => {
        const child = node.children.get(n);
        return dirPart + n + (child.type === 'dir' ? '/' : '');
      });
    }
  }

  if (!candidates.length) return;

  if (candidates.length === 1) {
    replacement = candidates[0];
  } else {
    replacement = commonPrefix(candidates);
    if (replacement === lastWord) return; // nothing new to add — leave as-is (no bell/UI for double-tab list)
  }

  const before = upToCaret.slice(0, upToCaret.length - lastWord.length);
  const after = text.slice(el.terminalInput.selectionStart);
  const newValue = before + replacement + after;
  el.terminalInput.value = newValue;
  const caretPos = (before + replacement).length;
  el.terminalInput.setSelectionRange(caretPos, caretPos);
}

function commonPrefix(strings) {
  if (!strings.length) return '';
  let prefix = strings[0];
  for (const s of strings.slice(1)) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

// Click anywhere in the terminal to focus the input with the caret at the
// end — like a real terminal. Skipped while the user is selecting text so
// copying command output still works.
el.terminalBody.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  if (sel && sel.toString().length > 0) return;
  el.terminalInput.focus();
  const len = el.terminalInput.value.length;
  el.terminalInput.setSelectionRange(len, len);
});

function submitInput() {
  const raw = el.terminalInput.value;
  if (!raw.trim()) return;
  const drill = currentDrill();
  if (!drill) return; // e.g. practice mode with an empty pool
  el.terminalInput.value = '';

  if (drill.quiz) {
    appendCmdLine(raw);
    const passed = safeCheck(drill, { shell: currentShell, fs: currentShell.fs, state: currentShell.state, result: null, input: raw });
    if (passed) {
      onDrillPassed(drill);
    } else {
      attemptCounts[drill.id] = (attemptCounts[drill.id] || 0) + 1;
      showFeedback(quizFeedbackFor(attemptCounts[drill.id]));
      if (lessonMode === 'practice') recordPracticeFailure(drill);
    }
    return;
  }

  appendCmdLine(raw);
  const result = currentShell.run(raw);

  if (currentShell.state.pendingEditor) {
    const req = currentShell.state.pendingEditor;
    currentShell.state.pendingEditor = null;
    startVimEditor(req);
    return;
  }

  if (result.stdout.includes('\x1bCLEAR\x1b')) {
    el.terminalOutput.innerHTML = '';
    appendBlock(result.stdout.split('\x1bCLEAR\x1b').join(''), 'term-line-out');
  } else {
    appendBlock(result.stdout, 'term-line-out');
  }
  appendBlock(result.stderr, 'term-line-err');
  updatePromptText();

  const passed = safeCheck(drill, { shell: currentShell, fs: currentShell.fs, state: currentShell.state, result, input: raw });
  if (passed) {
    onDrillPassed(drill);
  } else {
    attemptCounts[drill.id] = (attemptCounts[drill.id] || 0) + 1;
    showFeedback(feedbackFor(result, attemptCounts[drill.id]));
    if (lessonMode === 'practice') recordPracticeFailure(drill);
  }
}

function recordPracticeFailure(drill) {
  progress.completePracticeAttempt(currentLesson.id, drill, false, lessons);
  progress.save();
  renderPracticeStats();
}

// ---------------- Vim editor mode ----------------

function startVimEditor(req) {
  vimState = vimEditor.createVimState(req.content, req.path);
  el.terminalBody.classList.add('vim-capturing');
  el.vimBody.classList.remove('hidden');
  el.vimFilename.textContent = req.path;
  el.terminalInput.focus();
  renderVim();
}

function handleVimKeydown(key, ctrlKey) {
  const result = vimEditor.handleKey(vimState, key, ctrlKey);
  if (result.save) {
    currentShell.fs.writeFile(vimState.path, vimState.lines.join('\n') + '\n');
    vimState.dirty = false;
  }
  if (result.exit) {
    closeVimEditor();
    return;
  }
  renderVim();
}

function renderVim() {
  el.vimContent.innerHTML = '';
  vimState.lines.forEach((line, row) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'vim-line' + (row === vimState.cursorRow ? ' current' : '');

    if (vimState.showLineNumbers) {
      const num = document.createElement('span');
      num.className = 'vim-lineno';
      num.textContent = String(row + 1);
      lineEl.appendChild(num);
    }

    const textEl = document.createElement('span');
    textEl.className = 'vim-text';
    if (row === vimState.cursorRow) {
      const col = Math.min(vimState.cursorCol, line.length);
      const before = line.slice(0, col);
      const atCursor = line.slice(col, col + 1) || ' ';
      const after = line.slice(col + 1);
      textEl.appendChild(document.createTextNode(before));
      const cursorSpan = document.createElement('span');
      cursorSpan.className = 'vim-cursor';
      cursorSpan.textContent = atCursor;
      textEl.appendChild(cursorSpan);
      textEl.appendChild(document.createTextNode(after));
    } else {
      textEl.textContent = line.length ? line : ' ';
    }
    lineEl.appendChild(textEl);
    el.vimContent.appendChild(lineEl);
  });

  const cursorLineEl = el.vimContent.children[vimState.cursorRow];
  if (cursorLineEl) cursorLineEl.scrollIntoView({ block: 'nearest' });

  let status;
  if (vimState.mode === 'insert') status = '-- INSERT --';
  else if (vimState.mode === 'command') status = ':' + vimState.commandBuffer;
  else status = vimState.message || (vimState.dirty ? '[+] ' + vimState.path : vimState.path);
  el.vimStatusline.textContent = status;
}

function closeVimEditor() {
  const path = vimState.path;
  vimState = null;
  el.vimBody.classList.add('hidden');
  el.terminalBody.classList.remove('vim-capturing');
  el.terminalInput.focus();
  updatePromptText();

  const drill = currentDrill();
  if (!drill) return;
  const result = { stdout: '', stderr: '', code: 0 };
  const passed = safeCheck(drill, { shell: currentShell, fs: currentShell.fs, state: currentShell.state, result, input: 'vim ' + path });
  if (passed) {
    onDrillPassed(drill);
  } else {
    attemptCounts[drill.id] = (attemptCounts[drill.id] || 0) + 1;
    showFeedback(feedbackFor(result, attemptCounts[drill.id]));
    if (lessonMode === 'practice') recordPracticeFailure(drill);
  }
}

function showFeedback(fb) {
  el.feedbackNote.textContent = '🤔 ' + fb.text;
  el.feedbackNote.classList.remove('hidden', 'error');
  if (fb.tone === 'error') el.feedbackNote.classList.add('error');
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
  if (lessonMode === 'practice') return onPracticeDrillPassed(drill);

  el.feedbackNote.classList.add('hidden');
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

function onPracticeDrillPassed(drill) {
  el.feedbackNote.classList.add('hidden');
  let effectiveXp = drill.xp;
  if (revealState[drill.id] === 'solution') effectiveXp = Math.round(drill.xp * 0.3);
  else if (revealState[drill.id] === 'hint') effectiveXp = Math.round(drill.xp * 0.7);
  // completePracticeAttempt decides first-time-vs-repeat XP internally; a
  // hint/solution reveal only discounts the first-time award.
  const scaledDrill = { ...drill, xp: effectiveXp };

  const outcome = progress.completePracticeAttempt(currentLesson.id, scaledDrill, true, lessons);
  progress.save();
  sessionXp += outcome.xpGained;

  renderHeader();
  renderPracticeStats();

  el.successSub.textContent = `+${outcome.xpGained} XP`;
  el.successToast.classList.remove('hidden');

  for (const badge of outcome.newBadges) {
    showToast(`${badge.icon} Нова відзнака: ${badge.title}`, badge.desc);
  }
  if (outcome.leveledUp) {
    showToast('⭐ Новий рівень!', `Ти досяг рівня ${outcome.newLevel}`);
  }
}

el.nextBtn.addEventListener('click', () => {
  if (lessonMode === 'practice') {
    nextPracticeDrill();
    return;
  }
  currentDrillIndex++;
  if (currentDrillIndex >= currentLesson.drills.length) {
    if (currentLesson.practice && currentLesson.practice.length) {
      switchMode('practice');
    } else {
      showLessonComplete(currentLesson, false);
    }
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

el.restartBtn.addEventListener('click', () => {
  if (!currentLesson) return;
  const confirmed = window.confirm(
    `Скинути прогрес уроку «${currentLesson.title}» і почати спочатку? XP, які ти вже отримав, залишаться — але позначки виконання цього уроку зникнуть, і зможеш пройти його знову (включно з XP за кожен дрил).`
  );
  if (!confirmed) return;
  const lesson = currentLesson;
  progress.data.completedDrills[lesson.id] = [];
  progress.save();
  renderHeader();
  openLesson(lesson);
});
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

function renderCheatsheet() {
  const grid = $('cheatsheet-grid');
  if (!grid) return;
  for (const entry of CHEATSHEET) {
    const card = document.createElement('div');
    card.className = 'cheatsheet-card';
    const title = document.createElement('div');
    title.className = 'cheatsheet-card-title';
    title.textContent = `${entry.icon} ${entry.title}`;
    const cmds = document.createElement('div');
    cmds.className = 'cheatsheet-card-cmds';
    entry.cmds.forEach((cmd, i) => {
      const token = document.createElement('span');
      token.className = 'cmd-token';
      token.textContent = cmd.label;
      token.addEventListener('click', () => showCommandDoc(cmd.label, cmd.key));
      cmds.appendChild(token);
      if (i < entry.cmds.length - 1) cmds.appendChild(document.createTextNode(', '));
    });
    card.appendChild(title);
    card.appendChild(cmds);
    grid.appendChild(card);
  }
}

function showCommandDoc(label, key) {
  const doc = COMMAND_DOCS[key];
  if (!doc) return;
  el.commandDocTitle.textContent = label;
  el.commandDocDesc.textContent = doc.desc;

  el.commandDocOpts.innerHTML = '';
  if (doc.opts) {
    for (const [flag, desc] of doc.opts) {
      const row = document.createElement('div');
      row.className = 'command-doc-opt';
      const flagEl = document.createElement('span');
      flagEl.className = 'command-doc-opt-flag';
      flagEl.textContent = flag;
      const descEl = document.createElement('span');
      descEl.className = 'command-doc-opt-desc';
      descEl.textContent = desc;
      row.appendChild(flagEl);
      row.appendChild(descEl);
      el.commandDocOpts.appendChild(row);
    }
  }

  el.commandDocExample.textContent = doc.example ? '$ ' + doc.example : '';
  el.commandDocExample.classList.toggle('hidden', !doc.example);

  el.commandDocModal.classList.remove('hidden');
}

el.commandDocClose.addEventListener('click', () => el.commandDocModal.classList.add('hidden'));
el.commandDocModal.addEventListener('click', (e) => {
  if (e.target === el.commandDocModal) el.commandDocModal.classList.add('hidden');
});

function renderShortcuts() {
  const grid = $('shortcuts-grid');
  if (!grid) return;
  for (const group of SHORTCUT_GROUPS) {
    const card = document.createElement('div');
    card.className = 'shortcut-card';
    const title = document.createElement('div');
    title.className = 'shortcut-card-title';
    title.textContent = `${group.icon} ${group.title}`;
    card.appendChild(title);
    for (const [keys, desc] of group.items) {
      const row = document.createElement('div');
      row.className = 'shortcut-row';
      const keysEl = document.createElement('span');
      keysEl.className = 'shortcut-keys';
      keysEl.textContent = keys;
      const descEl = document.createElement('span');
      descEl.className = 'shortcut-desc';
      descEl.textContent = desc;
      row.appendChild(keysEl);
      row.appendChild(descEl);
      card.appendChild(row);
    }
    grid.appendChild(card);
  }
}

async function boot() {
  await progress.load();
  renderHeader();
  renderSidebar();
  renderCheatsheet();
  renderShortcuts();
  setupUpdater();
}

boot();
