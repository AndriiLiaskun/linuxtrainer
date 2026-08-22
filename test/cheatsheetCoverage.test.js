const path = require('path');
const { REGISTRY } = require(path.join(__dirname, '..', 'renderer', 'shell', 'shell.js'));
const { CHEATSHEET } = require(path.join(__dirname, '..', 'renderer', 'data', 'cheatsheet.js'));

// Aliases deliberately folded into their canonical command's description
// instead of getting their own cheatsheet card (see commandDocs.js notes).
const ALIAS_EXCEPTIONS = new Set(['apt-get', 'egrep', 'more', 'gunzip', 'vi', 'vim']);

let passed = 0, failed = 0;
const failures = [];
function check(desc, cond) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(`FAIL: ${desc}`);
  }
}

const covered = new Set();
for (const category of CHEATSHEET) {
  for (const cmd of category.cmds) covered.add(cmd.label);
}
covered.add('git');
covered.add('docker');
covered.add('kubectl');

const allRegistered = Object.keys(REGISTRY);
for (const cmdName of allRegistered) {
  if (ALIAS_EXCEPTIONS.has(cmdName)) continue;
  check(`registered command "${cmdName}" appears in the welcome-screen cheatsheet`, covered.has(cmdName));
}

module.exports = { passed, failed, failures };
