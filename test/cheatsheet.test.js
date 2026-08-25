const path = require('path');
const { CHEATSHEET } = require(path.join(__dirname, '..', 'renderer', 'data', 'cheatsheet.js'));
const { COMMAND_DOCS } = require(path.join(__dirname, '..', 'renderer', 'data', 'commandDocs.js'));

let passed = 0, failed = 0;
const failures = [];
function check(desc, cond) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(`FAIL: ${desc}`);
  }
}

for (const category of CHEATSHEET) {
  for (const cmd of category.cmds) {
    check(`${category.title}/${cmd.label} (key "${cmd.key}") has a doc entry`, !!COMMAND_DOCS[cmd.key]);
    const doc = COMMAND_DOCS[cmd.key];
    if (doc) {
      check(`${cmd.key} has a non-empty description`, typeof doc.desc === 'string' && doc.desc.length > 0);
      if (doc.opts) {
        check(
          `${cmd.key} opts is an array of [flag, desc] or [flag, desc, example] tuples`,
          doc.opts.every((o) => Array.isArray(o) && (o.length === 2 || o.length === 3) && typeof o[0] === 'string' && typeof o[1] === 'string' && (o.length === 2 || typeof o[2] === 'string'))
        );
      }
    }
  }
}

module.exports = { passed, failed, failures };
