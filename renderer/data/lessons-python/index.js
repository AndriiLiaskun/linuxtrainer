'use strict';

// Separate from renderer/data/lessons/index.js on purpose — Python drills
// run through pythonWorker.js (real Pyodide execution), not the bash Shell
// engine, so mixing them into the same array would break
// test/lessons.test.js (which replays every drill.solution via shell.run()).
module.exports = [
  require('./01-basics.js'),
];
