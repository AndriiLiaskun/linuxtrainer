// Bash/readline-style line-editing, as pure functions over a plain state
// object: { value, caret, killRing }. No DOM — app.js reads the real
// <input>'s value/selectionStart into this shape, applies a key, and
// writes the result back. Kept pure so it's unit-testable like vimEditor.js.
'use strict';

function freshState(value, caret) {
  return { value, caret: caret != null ? caret : value.length, killRing: '' };
}

function isWordChar(ch) {
  return /\S/.test(ch);
}

// Ctrl+W: delete the word immediately before the caret (stops at whitespace).
function wordStartBefore(value, caret) {
  let i = caret;
  while (i > 0 && !isWordChar(value[i - 1])) i--;
  while (i > 0 && isWordChar(value[i - 1])) i--;
  return i;
}

// key: 'a'|'e'|'u'|'k'|'w'|'y'|'c' (the letter, lowercase, with ctrl held).
// Returns a NEW state; never mutates the input. `handled` tells the caller
// whether this key combo means anything here (so it knows to preventDefault).
function applyReadlineKey(state, key) {
  const { value, caret, killRing } = state;

  switch (key) {
    case 'a':
      return { ...state, caret: 0 };
    case 'e':
      return { ...state, caret: value.length };
    case 'u': {
      const killed = value.slice(0, caret);
      return { value: value.slice(caret), caret: 0, killRing: killed || killRing };
    }
    case 'k': {
      const killed = value.slice(caret);
      return { value: value.slice(0, caret), caret, killRing: killed || killRing };
    }
    case 'w': {
      const start = wordStartBefore(value, caret);
      const killed = value.slice(start, caret);
      return { value: value.slice(0, start) + value.slice(caret), caret: start, killRing: killed || killRing };
    }
    case 'y': {
      if (!killRing) return state;
      const newValue = value.slice(0, caret) + killRing + value.slice(caret);
      return { value: newValue, caret: caret + killRing.length, killRing };
    }
    case 'c':
      // Caller decides whether to let native copy-on-selection proceed;
      // when there's no selection this means "abort the current line".
      return { value: '', caret: 0, killRing };
    default:
      return state;
  }
}

module.exports = { freshState, applyReadlineKey, wordStartBefore };
