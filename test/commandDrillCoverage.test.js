const path = require('path');
const { REGISTRY } = require(path.join(__dirname, '..', 'renderer', 'shell', 'shell.js'));
const lessons = require(path.join(__dirname, '..', 'renderer', 'data', 'lessons', 'index.js'));

// Aliases that are mechanically identical to a command already drilled
// extensively (apt-get=apt, egrep=grep -E, gunzip=gzip -d, more=less,
// vi=vim) — deliberately not duplicated with their own drills.
const ALIAS_EXCEPTIONS = new Set(['apt-get', 'egrep', 'gunzip', 'more', 'vi']);

let passed = 0, failed = 0;
const failures = [];
function check(desc, cond) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(`FAIL: ${desc}`);
  }
}

const allCmds = Object.keys(REGISTRY);
const used = new Set();

function scanText(text) {
  if (!text) return;
  for (const cmd of allCmds) {
    const escaped = cmd.replace(/-/g, '\\-');
    const re = new RegExp('(^|[^a-zA-Z0-9_-])' + escaped + '([^a-zA-Z0-9_-]|$)');
    if (re.test(text)) used.add(cmd);
  }
}

for (const lesson of lessons) {
  for (const drill of lesson.drills) {
    scanText(drill.solution);
    if (drill.vim) scanText(drill.vim.script);
  }
  for (const drill of lesson.practice || []) {
    scanText(drill.solution);
    if (drill.vim) scanText(drill.vim.script);
  }
}

for (const cmdName of allCmds) {
  if (ALIAS_EXCEPTIONS.has(cmdName)) continue;
  check(`registered command "${cmdName}" is exercised by at least one drill`, used.has(cmdName));
}

module.exports = { passed, failed, failures };
