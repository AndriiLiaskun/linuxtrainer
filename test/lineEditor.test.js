const path = require('path');
const { freshState, applyReadlineKey, wordStartBefore } = require(path.join(__dirname, '..', 'renderer', 'lineEditor.js'));

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

// Ctrl+A / Ctrl+E — jump to start/end
{
  const s = freshState('hello world', 5);
  check('Ctrl+A moves caret to 0', applyReadlineKey(s, 'a').caret, 0);
  check('Ctrl+E moves caret to end', applyReadlineKey(s, 'e').caret, 11);
}

// Ctrl+U — kill from caret to start
{
  const s = freshState('hello world', 6);
  const r = applyReadlineKey(s, 'u');
  check('Ctrl+U removes text before caret', r.value, 'world');
  check('Ctrl+U moves caret to 0', r.caret, 0);
  check('Ctrl+U stores killed text', r.killRing, 'hello ');
}

// Ctrl+K — kill from caret to end
{
  const s = freshState('hello world', 5);
  const r = applyReadlineKey(s, 'k');
  check('Ctrl+K removes text after caret', r.value, 'hello');
  check('Ctrl+K keeps caret in place', r.caret, 5);
  check('Ctrl+K stores killed text', r.killRing, ' world');
}

// Ctrl+W — delete word before caret
{
  const s = freshState('grep -i error app.log', 22);
  const r = applyReadlineKey(s, 'w');
  check('Ctrl+W removes last word', r.value, 'grep -i error ');
  check('Ctrl+W caret at new end', r.caret, 14);
}
{
  // stops at whitespace, not at the start of the string
  const s = freshState('one two', 7);
  const r = applyReadlineKey(s, 'w');
  check('Ctrl+W only removes the last word, not everything', r.value, 'one ');
}

// Ctrl+Y — yank last kill back at caret
{
  let s = freshState('hello world', 6);
  s = applyReadlineKey(s, 'u'); // kills "hello ", value="world", caret=0
  s = { ...s, caret: 5 }; // move to end ("world")
  const r = applyReadlineKey(s, 'y');
  check('Ctrl+Y re-inserts the last killed text', r.value, 'worldhello ');
}

// Ctrl+C — clears the current line
{
  const s = freshState('some unfinished command', 10);
  const r = applyReadlineKey(s, 'c');
  check('Ctrl+C clears the line', r.value, '');
  check('Ctrl+C resets caret', r.caret, 0);
}

// wordStartBefore helper — used by Ctrl+W, sanity-checked directly
{
  check('wordStartBefore finds the start of the last word', wordStartBefore('foo bar baz', 11), 8);
  check('wordStartBefore handles caret mid-word', wordStartBefore('foo bar', 5), 4);
  check('wordStartBefore at position 0 stays 0', wordStartBefore('foo', 0), 0);
}

module.exports = { passed, failed, failures };
