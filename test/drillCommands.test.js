const path = require('path');
const { extractCommands } = require(path.join(__dirname, '..', 'renderer', 'drillCommands.js'));
const { REGISTRY } = require(path.join(__dirname, '..', 'renderer', 'shell', 'shell.js'));

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

const keys = Object.keys(REGISTRY);

check(
  'extracts commands from a chained solution in order of first appearance',
  extractCommands('mkdir app && cd app && git init', keys),
  ['mkdir', 'cd', 'git']
);
check(
  'dedupes repeated commands',
  extractCommands('cd projects && cd webapp && ls', keys),
  ['cd', 'ls']
);
check(
  'ignores flags, filenames, and pipe/redirect symbols',
  extractCommands("grep -r ERROR projects/webapp/logs/app.log | wc -l", keys),
  ['grep', 'wc']
);
check(
  'does not false-positive on filenames that share a substring with a command (find.txt)',
  extractCommands('touch find.txt && cat find.txt', keys),
  ['touch', 'cat']
);
check(
  'recognizes special-cased keywords not in REGISTRY (export/for)',
  extractCommands('export NAME=demo && for f in *.txt; do echo $f; done', keys),
  ['export', 'for', 'echo']
);
check(
  'recognizes the if keyword',
  extractCommands('if [ -f a.txt ]; then echo yes; fi', keys),
  ['if', 'echo']
);
check('empty/undefined solution returns empty array', extractCommands(undefined, keys), []);
check('solution with no known commands returns empty array', extractCommands('xyzzy plugh', keys), []);

module.exports = { passed, failed, failures };
