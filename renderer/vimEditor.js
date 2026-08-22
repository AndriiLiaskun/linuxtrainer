// A small vim/vi simulation covering exactly what real DevOps onboarding
// material teaches (see the "VIM EDITOR" section of most Linux quickstart
// guides): i/Esc/:wq insert-save-quit, gg/G/w/b motion, dd/x/dw delete,
// yy/p/P yank-paste, u/Ctrl+R undo-redo, and a handful of :ex commands.
// Pure state-machine, no DOM — app.js renders `state` and forwards keydown.
'use strict';

function createVimState(content, path) {
  const lines = content.length ? content.replace(/\n$/, '').split('\n') : [''];
  return {
    path,
    lines: lines.length ? lines : [''],
    cursorRow: 0,
    cursorCol: 0,
    mode: 'normal', // 'normal' | 'insert' | 'command'
    commandBuffer: '',
    countBuffer: '',
    pendingOp: null, // 'd' | 'y' | 'g' — waiting for a second key
    yankBuffer: null, // { lines: [...] } — always line-wise for simplicity
    undoStack: [],
    redoStack: [],
    showLineNumbers: false,
    message: 'NORMAL — i: вставка, dd: видалити рядок, :wq: зберегти й вийти',
    dirty: false,
    lastSearch: null,
  };
}

function clampCursor(state) {
  state.cursorRow = Math.max(0, Math.min(state.cursorRow, state.lines.length - 1));
  const lineLen = state.lines[state.cursorRow].length;
  const maxCol = state.mode === 'insert' ? lineLen : Math.max(0, lineLen - 1);
  state.cursorCol = Math.max(0, Math.min(state.cursorCol, maxCol));
}

function pushUndo(state) {
  state.undoStack.push({ lines: state.lines.slice(), cursorRow: state.cursorRow, cursorCol: state.cursorCol });
  if (state.undoStack.length > 100) state.undoStack.shift();
  state.redoStack = [];
}

function undo(state) {
  const snap = state.undoStack.pop();
  if (!snap) {
    state.message = 'Already at oldest change';
    return;
  }
  state.redoStack.push({ lines: state.lines.slice(), cursorRow: state.cursorRow, cursorCol: state.cursorCol });
  state.lines = snap.lines;
  state.cursorRow = snap.cursorRow;
  state.cursorCol = snap.cursorCol;
  clampCursor(state);
}

function redo(state) {
  const snap = state.redoStack.pop();
  if (!snap) {
    state.message = 'Already at newest change';
    return;
  }
  state.undoStack.push({ lines: state.lines.slice(), cursorRow: state.cursorRow, cursorCol: state.cursorCol });
  state.lines = snap.lines;
  state.cursorRow = snap.cursorRow;
  state.cursorCol = snap.cursorCol;
  clampCursor(state);
}

function wordForward(state) {
  const line = state.lines[state.cursorRow];
  let r = state.cursorRow;
  let c = state.cursorCol;
  const isWord = (ch) => ch !== undefined && /\S/.test(ch);
  // skip current word
  while (isWord(state.lines[r][c]) && c < state.lines[r].length) c++;
  // skip whitespace, crossing lines if needed
  while (true) {
    const ln = state.lines[r];
    if (c >= ln.length) {
      if (r < state.lines.length - 1) {
        r++;
        c = 0;
        if (state.lines[r].length === 0) break;
        continue;
      }
      break;
    }
    if (!/\S/.test(ln[c])) c++;
    else break;
  }
  state.cursorRow = r;
  state.cursorCol = c;
}

function wordBackward(state) {
  let r = state.cursorRow;
  let c = state.cursorCol;
  const step = () => {
    if (c > 0) c--;
    else if (r > 0) {
      r--;
      c = Math.max(0, state.lines[r].length - 1);
    }
  };
  step();
  while ((r > 0 || c > 0) && !/\S/.test(state.lines[r][c] || '')) step();
  while (c > 0 && /\S/.test(state.lines[r][c - 1] || '')) c--;
  state.cursorRow = r;
  state.cursorCol = c;
}

function count(state) {
  return state.countBuffer ? Math.max(1, parseInt(state.countBuffer, 10)) : 1;
}

// Returns { exit: bool, save: bool, forceQuit: bool }
function runExCommand(state, cmd) {
  const trimmed = cmd.trim();
  if (trimmed === 'w') return { save: true };
  if (trimmed === 'q') return state.dirty ? { blockedDirty: true } : { exit: true };
  if (trimmed === 'q!') return { exit: true, forceQuit: true };
  if (trimmed === 'wq' || trimmed === 'x' || trimmed === 'wq!') return { exit: true, save: true };
  if (trimmed === 'se nu' || trimmed === 'set nu' || trimmed === 'set number') {
    state.showLineNumbers = true;
    return {};
  }
  if (trimmed === 'se nonu' || trimmed === 'set nonu' || trimmed === 'set nonumber') {
    state.showLineNumbers = false;
    return {};
  }
  if (/^\d+$/.test(trimmed)) {
    state.cursorRow = Math.max(0, Math.min(parseInt(trimmed, 10) - 1, state.lines.length - 1));
    state.cursorCol = 0;
    return {};
  }
  state.message = `E492: Not an editor command: ${trimmed}`;
  return {};
}

// key: the DOM KeyboardEvent.key. Returns { exit, save, forceQuit } when the
// editor should close (app.js acts on it); otherwise undefined/{} and the
// caller just re-renders.
function handleKey(state, key, ctrlKey) {
  state.message = '';

  if (state.mode === 'insert') {
    if (key === 'Escape') {
      state.mode = 'normal';
      state.cursorCol = Math.max(0, state.cursorCol - 1);
      return {};
    }
    if (key === 'Enter') {
      pushUndo(state);
      const line = state.lines[state.cursorRow];
      const before = line.slice(0, state.cursorCol);
      const after = line.slice(state.cursorCol);
      state.lines.splice(state.cursorRow, 1, before, after);
      state.cursorRow++;
      state.cursorCol = 0;
      state.dirty = true;
      return {};
    }
    if (key === 'Backspace') {
      pushUndo(state);
      if (state.cursorCol > 0) {
        const line = state.lines[state.cursorRow];
        state.lines[state.cursorRow] = line.slice(0, state.cursorCol - 1) + line.slice(state.cursorCol);
        state.cursorCol--;
      } else if (state.cursorRow > 0) {
        const prevLen = state.lines[state.cursorRow - 1].length;
        state.lines[state.cursorRow - 1] += state.lines[state.cursorRow];
        state.lines.splice(state.cursorRow, 1);
        state.cursorRow--;
        state.cursorCol = prevLen;
      } else {
        state.undoStack.pop();
      }
      state.dirty = true;
      return {};
    }
    if (key.length === 1) {
      pushUndo(state);
      const line = state.lines[state.cursorRow];
      state.lines[state.cursorRow] = line.slice(0, state.cursorCol) + key + line.slice(state.cursorCol);
      state.cursorCol++;
      state.dirty = true;
    }
    return {};
  }

  if (state.mode === 'command') {
    if (key === 'Escape') {
      state.mode = 'normal';
      state.commandBuffer = '';
      return {};
    }
    if (key === 'Enter') {
      const cmd = state.commandBuffer;
      state.commandBuffer = '';
      state.mode = 'normal';
      const result = runExCommand(state, cmd);
      if (result.blockedDirty) {
        state.message = 'E37: No write since last change (add ! to override)';
      }
      return result;
    }
    if (key === 'Backspace') {
      state.commandBuffer = state.commandBuffer.slice(0, -1);
      return {};
    }
    if (key.length === 1) state.commandBuffer += key;
    return {};
  }

  // NORMAL mode
  if (key === 'Escape') {
    state.pendingOp = null;
    state.countBuffer = '';
    return {};
  }
  if (/^[1-9]$/.test(key) || (key === '0' && state.countBuffer)) {
    state.countBuffer += key;
    return {};
  }
  if (key === '0' && !state.countBuffer) {
    state.cursorCol = 0;
    return {};
  }
  if (key === '$') {
    state.cursorCol = Math.max(0, state.lines[state.cursorRow].length - 1);
    state.countBuffer = '';
    return {};
  }
  if (key === ':') {
    state.mode = 'command';
    state.commandBuffer = '';
    state.countBuffer = '';
    return {};
  }
  if (key === 'i') {
    state.mode = 'insert';
    state.countBuffer = '';
    return {};
  }
  if (key === 'a') {
    state.mode = 'insert';
    state.cursorCol = Math.min(state.cursorCol + 1, state.lines[state.cursorRow].length);
    state.countBuffer = '';
    return {};
  }
  if (key === 'o') {
    pushUndo(state);
    state.lines.splice(state.cursorRow + 1, 0, '');
    state.cursorRow++;
    state.cursorCol = 0;
    state.mode = 'insert';
    state.dirty = true;
    state.countBuffer = '';
    return {};
  }
  if (key === 'O') {
    pushUndo(state);
    state.lines.splice(state.cursorRow, 0, '');
    state.cursorCol = 0;
    state.mode = 'insert';
    state.dirty = true;
    state.countBuffer = '';
    return {};
  }
  if (key === 'u') {
    undo(state);
    state.countBuffer = '';
    return {};
  }
  if (key === 'r' && ctrlKey) {
    redo(state);
    state.countBuffer = '';
    return {};
  }
  if (key === 'h' || key === 'ArrowLeft') {
    state.cursorCol = Math.max(0, state.cursorCol - count(state));
    state.countBuffer = '';
    return {};
  }
  if (key === 'l' || key === 'ArrowRight') {
    state.cursorCol += count(state);
    clampCursor(state);
    state.countBuffer = '';
    return {};
  }
  if (key === 'j' || key === 'ArrowDown') {
    state.cursorRow = Math.min(state.lines.length - 1, state.cursorRow + count(state));
    clampCursor(state);
    state.countBuffer = '';
    return {};
  }
  if (key === 'k' || key === 'ArrowUp') {
    state.cursorRow = Math.max(0, state.cursorRow - count(state));
    clampCursor(state);
    state.countBuffer = '';
    return {};
  }
  if (key === 'w') {
    if (state.pendingOp === 'd') {
      pushUndo(state);
      const line = state.lines[state.cursorRow];
      const startCol = state.cursorCol;
      const savedState = { cursorRow: state.cursorRow, cursorCol: state.cursorCol };
      wordForward(state);
      if (state.cursorRow === savedState.cursorRow) {
        state.lines[state.cursorRow] = line.slice(0, startCol) + line.slice(state.cursorCol);
        state.cursorCol = startCol;
      }
      state.pendingOp = null;
      state.dirty = true;
    } else {
      const n = count(state);
      for (let i = 0; i < n; i++) wordForward(state);
    }
    state.countBuffer = '';
    return {};
  }
  if (key === 'b') {
    const n = count(state);
    for (let i = 0; i < n; i++) wordBackward(state);
    state.countBuffer = '';
    state.pendingOp = null;
    return {};
  }
  if (key === 'g') {
    if (state.pendingOp === 'g') {
      state.cursorRow = state.countBuffer ? Math.min(count(state) - 1, state.lines.length - 1) : 0;
      state.cursorCol = 0;
      state.pendingOp = null;
      state.countBuffer = '';
    } else {
      state.pendingOp = 'g';
    }
    return {};
  }
  if (key === 'G') {
    state.cursorRow = state.countBuffer ? Math.min(count(state) - 1, state.lines.length - 1) : state.lines.length - 1;
    state.cursorCol = 0;
    state.countBuffer = '';
    state.pendingOp = null;
    return {};
  }
  if (key === 'x') {
    pushUndo(state);
    const line = state.lines[state.cursorRow];
    const n = count(state);
    state.lines[state.cursorRow] = line.slice(0, state.cursorCol) + line.slice(state.cursorCol + n);
    clampCursor(state);
    state.dirty = true;
    state.countBuffer = '';
    return {};
  }
  if (key === 'd') {
    if (state.pendingOp === 'd') {
      pushUndo(state);
      const n = count(state);
      const removed = state.lines.splice(state.cursorRow, n);
      state.yankBuffer = { lines: removed };
      if (!state.lines.length) state.lines = [''];
      clampCursor(state);
      state.dirty = true;
      state.pendingOp = null;
      state.countBuffer = '';
    } else {
      state.pendingOp = 'd';
      // keep countBuffer — "2dd" needs the count to survive to the 2nd 'd'
    }
    return {};
  }
  if (key === 'y') {
    if (state.pendingOp === 'y') {
      const n = count(state);
      state.yankBuffer = { lines: state.lines.slice(state.cursorRow, state.cursorRow + n) };
      state.pendingOp = null;
      state.countBuffer = '';
    } else {
      state.pendingOp = 'y';
    }
    return {};
  }
  if (key === 'p') {
    if (state.yankBuffer) {
      pushUndo(state);
      state.lines.splice(state.cursorRow + 1, 0, ...state.yankBuffer.lines);
      state.cursorRow += 1;
      state.dirty = true;
    }
    state.countBuffer = '';
    return {};
  }
  if (key === 'P') {
    if (state.yankBuffer) {
      pushUndo(state);
      state.lines.splice(state.cursorRow, 0, ...state.yankBuffer.lines);
      state.dirty = true;
    }
    state.countBuffer = '';
    return {};
  }
  // unrecognized key in normal mode — ignore, matching vim's silent no-op for junk input
  state.pendingOp = null;
  state.countBuffer = '';
  return {};
}

// ---- scripted playback, used by content validation (test/lessons.test.js) ----
// Notation: literal characters are literal keypresses; special keys use
// <Esc> <Enter> <BS> <Tab> <C-r> (Ctrl+R). Mirrors what a human would type.
function parseVimScript(script) {
  const events = [];
  let i = 0;
  while (i < script.length) {
    if (script[i] === '<') {
      const close = script.indexOf('>', i);
      if (close === -1) {
        events.push({ key: script[i], ctrl: false });
        i++;
        continue;
      }
      const token = script.slice(i + 1, close);
      const map = { Esc: 'Escape', Enter: 'Enter', BS: 'Backspace', Tab: 'Tab' };
      if (token === 'C-r') events.push({ key: 'r', ctrl: true });
      else events.push({ key: map[token] || token, ctrl: false });
      i = close + 1;
      continue;
    }
    events.push({ key: script[i], ctrl: false });
    i++;
  }
  return events;
}

// Runs a vim session on `shell` starting from `vim path`, replaying `script`.
// Mutates the shell's filesystem exactly as a live user session would.
function runVimScript(shell, path, script) {
  shell.run(`vim ${path}`);
  const req = shell.state.pendingEditor;
  shell.state.pendingEditor = null;
  const state = createVimState(req ? req.content : '', req ? req.path : shell.fs.normalize(path));
  const events = parseVimScript(script);
  let final = {};
  for (const ev of events) {
    const res = handleKey(state, ev.key, ev.ctrl);
    if (res.save) shell.fs.writeFile(state.path, state.lines.join('\n') + '\n');
    if (res.exit) {
      final = res;
      break;
    }
  }
  return { state, result: final };
}

module.exports = { createVimState, handleKey, parseVimScript, runVimScript };
