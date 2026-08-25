const path = require('path');
const { createVimState, handleKey } = require(path.join(__dirname, '..', 'renderer', 'vimEditor.js'));

let passed = 0, failed = 0;
const failures = [];
function check(desc, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else {
    failed++;
    failures.push(`FAIL: ${desc}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

function type(state, text) {
  for (const ch of text) handleKey(state, ch, false);
}

// --- basic insert + save+quit flow (exactly what the tutorial teaches) ---
{
  const s = createVimState('', 'firstfile.txt');
  handleKey(s, 'i', false);
  check('i enters insert mode', s.mode, 'insert');
  type(s, 'This is first line in vim editor.');
  handleKey(s, 'Enter', false);
  type(s, "This one's second");
  handleKey(s, 'Escape', false);
  check('Esc returns to normal mode', s.mode, 'normal');
  check('lines after typing', s.lines, ['This is first line in vim editor.', "This one's second"]);
  handleKey(s, ':', false);
  type(s, 'wq');
  const result = handleKey(s, 'Enter', false);
  check(':wq exits and requests save', result, { exit: true, save: true });
}

// --- :q blocked when dirty, :q! forces it ---
{
  const s = createVimState('hello\n', 'f.txt');
  handleKey(s, 'i', false);
  type(s, 'X');
  handleKey(s, 'Escape', false);
  handleKey(s, ':', false);
  type(s, 'q');
  let r = handleKey(s, 'Enter', false);
  check(':q on dirty buffer is blocked', !!r.blockedDirty, true);
  handleKey(s, ':', false);
  type(s, 'q!');
  r = handleKey(s, 'Enter', false);
  check(':q! forces quit without saving', r, { exit: true, forceQuit: true });
}

// --- dd deletes the current line ---
{
  const s = createVimState('a\nb\nc\n', 'f.txt');
  handleKey(s, 'd', false);
  handleKey(s, 'd', false);
  check('dd removes first line', s.lines, ['b', 'c']);
  check('yank buffer holds deleted line', s.yankBuffer.lines, ['a']);
}

// --- ndd deletes n lines ---
{
  const s = createVimState('a\nb\nc\nd\n', 'f.txt');
  type(s, '2');
  handleKey(s, 'd', false);
  handleKey(s, 'd', false);
  check('2dd removes first two lines', s.lines, ['c', 'd']);
}

// --- yy + p yanks and pastes below cursor ---
{
  const s = createVimState('a\nb\nc\n', 'f.txt');
  handleKey(s, 'y', false);
  handleKey(s, 'y', false);
  handleKey(s, 'j', false); // move to line b
  handleKey(s, 'p', false);
  check('yy+j+p pastes yanked line below', s.lines, ['a', 'b', 'a', 'c']);
}

// --- gg / G motions ---
{
  const s = createVimState('a\nb\nc\nd\n', 'f.txt');
  handleKey(s, 'G', false);
  check('G moves to last line', s.cursorRow, 3);
  handleKey(s, 'g', false);
  handleKey(s, 'g', false);
  check('gg moves to first line', s.cursorRow, 0);
}

// --- x deletes char under cursor ---
{
  const s = createVimState('abc\n', 'f.txt');
  handleKey(s, 'x', false);
  check('x deletes first char', s.lines, ['bc']);
}

// --- u undoes, Ctrl+R redoes ---
{
  const s = createVimState('abc\n', 'f.txt');
  handleKey(s, 'x', false);
  check('x deleted a char', s.lines, ['bc']);
  handleKey(s, 'u', false);
  check('u restores the line', s.lines, ['abc']);
  handleKey(s, 'r', true);
  check('Ctrl+R redoes the delete', s.lines, ['bc']);
}

// --- w / b word motion ---
{
  const s = createVimState('hello world foo\n', 'f.txt');
  handleKey(s, 'w', false);
  check('w moves to start of next word', s.cursorCol, 6);
  handleKey(s, 'w', false);
  check('w again moves to third word', s.cursorCol, 12);
  handleKey(s, 'b', false);
  check('b moves back a word', s.cursorCol, 6);
}

// --- dw deletes a word ---
{
  const s = createVimState('hello world\n', 'f.txt');
  handleKey(s, 'd', false);
  handleKey(s, 'w', false);
  check('dw deletes the first word', s.lines, ['world']);
}

// --- :se nu toggles line numbers (cosmetic state flag) ---
{
  const s = createVimState('a\n', 'f.txt');
  handleKey(s, ':', false);
  type(s, 'se nu');
  handleKey(s, 'Enter', false);
  check('se nu sets showLineNumbers', s.showLineNumbers, true);
}

// --- o / O open a new line below/above and enter insert mode ---
{
  const s = createVimState('a\nb\n', 'f.txt');
  handleKey(s, 'o', false);
  check('o enters insert mode', s.mode, 'insert');
  type(s, 'NEW');
  handleKey(s, 'Escape', false);
  check('o opens a line below cursor', s.lines, ['a', 'NEW', 'b']);
}
{
  const s = createVimState('a\nb\n', 'f.txt');
  handleKey(s, 'O', false);
  type(s, 'NEW');
  handleKey(s, 'Escape', false);
  check('O opens a line above cursor', s.lines, ['NEW', 'a', 'b']);
}

// --- runVimScript: end-to-end simulation against a real Shell/filesystem ---
{
  const { Shell } = require(path.join(__dirname, '..', 'renderer', 'shell', 'shell.js'));
  const { runVimScript } = require(path.join(__dirname, '..', 'renderer', 'vimEditor.js'));
  const sh = new Shell();
  const { result } = runVimScript(sh, 'greeting.txt', 'iHello DevOps<Esc>:wq<Enter>');
  check('runVimScript exits after :wq', !!result.exit, true);
  check('runVimScript writes the file to the real filesystem', sh.fs.getNode('/home/student/greeting.txt').content, 'Hello DevOps\n');
}
{
  const { Shell } = require(path.join(__dirname, '..', 'renderer', 'shell', 'shell.js'));
  const { runVimScript } = require(path.join(__dirname, '..', 'renderer', 'vimEditor.js'));
  const sh = new Shell();
  runVimScript(sh, 'documents/notes.txt', 'dd:wq<Enter>');
  check('runVimScript can edit an existing seeded file (dd removes first line)', sh.fs.getNode('/home/student/documents/notes.txt').content, 'Buy coffee\nDeploy app on Friday\n');
}

// --- /pattern search + n/N navigation between matches ---
{
  const s = createVimState('the quick brown fox\njumps over the lazy dog\nthe fox runs\n', 'f.txt');
  handleKey(s, '/', false);
  check('/ enters search mode', s.mode, 'search');
  type(s, 'fox');
  check('typing builds up the search buffer (visible in the statusline)', s.searchBuffer, 'fox');
  handleKey(s, 'Enter', false);
  check('Enter jumps to the first match after the cursor', [s.cursorRow, s.cursorCol], [0, 16]);
  check('search mode exits back to normal after Enter', s.mode, 'normal');
  handleKey(s, 'n', false);
  check('n jumps to the NEXT match', [s.cursorRow, s.cursorCol], [2, 4]);
  handleKey(s, 'n', false);
  check('n wraps back around to the first match when at the last one', [s.cursorRow, s.cursorCol], [0, 16]);
  handleKey(s, 'N', false);
  check('N searches BACKWARD, wrapping to the last match', [s.cursorRow, s.cursorCol], [2, 4]);
}
{
  const s = createVimState('alpha\nbeta\ngamma\n', 'f.txt');
  handleKey(s, '/', false);
  type(s, 'zzz');
  handleKey(s, 'Enter', false);
  check('a pattern with no match shows E486 and leaves the cursor put', s.message, 'E486: Pattern not found: zzz');
  check('cursor did not move on a failed search', [s.cursorRow, s.cursorCol], [0, 0]);
}
{
  const s = createVimState('one two\n', 'f.txt');
  const r = handleKey(s, 'n', false);
  check('n with no previous search shows E35, not a crash', s.message, 'E35: No previous regular expression');
}
{
  const s = createVimState('one two\n', 'f.txt');
  handleKey(s, '/', false);
  type(s, 'tw');
  handleKey(s, 'Escape', false);
  check('Escape cancels the search and returns to normal mode', s.mode, 'normal');
  check('Escape clears the half-typed search buffer', s.searchBuffer, '');
  check('cursor stays put when a search is cancelled', [s.cursorRow, s.cursorCol], [0, 0]);
}
{
  // dd after a search should operate on the line the search landed on —
  // confirms search integrates with the rest of normal-mode, not a bolt-on.
  const s = createVimState('keep me\nfind this line\nkeep me too\n', 'f.txt');
  handleKey(s, '/', false);
  type(s, 'find');
  handleKey(s, 'Enter', false);
  handleKey(s, 'd', false);
  handleKey(s, 'd', false);
  check('dd after a search deletes the line the search moved the cursor to', s.lines, ['keep me', 'keep me too']);
}

module.exports = { passed, failed, failures };
