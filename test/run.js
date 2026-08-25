const engine = require('./engine.test.js');
const practiceEngine = require('./practiceEngine.test.js');
const vimEditor = require('./vimEditor.test.js');
const lineEditor = require('./lineEditor.test.js');
const cheatsheet = require('./cheatsheet.test.js');
const cheatsheetCoverage = require('./cheatsheetCoverage.test.js');
const commandDrillCoverage = require('./commandDrillCoverage.test.js');
const lessons = require('./lessons.test.js');
const drillCommands = require('./drillCommands.test.js');
const pythonLessons = require('./pythonLessons.test.js');

(async () => {
  console.log(`Engine tests: ${engine.passed} passed, ${engine.failed} failed`);
  if (engine.failed) console.log(engine.failures.join('\n\n'));

  console.log(`\nPractice engine tests: ${practiceEngine.passed} passed, ${practiceEngine.failed} failed`);
  if (practiceEngine.failed) console.log(practiceEngine.failures.join('\n\n'));

  console.log(`\nVim editor tests: ${vimEditor.passed} passed, ${vimEditor.failed} failed`);
  if (vimEditor.failed) console.log(vimEditor.failures.join('\n\n'));

  console.log(`\nLine editor tests: ${lineEditor.passed} passed, ${lineEditor.failed} failed`);
  if (lineEditor.failed) console.log(lineEditor.failures.join('\n\n'));

  console.log(`\nCheatsheet doc coverage: ${cheatsheet.passed} passed, ${cheatsheet.failed} failed`);
  if (cheatsheet.failed) console.log(cheatsheet.failures.join('\n\n'));

  console.log(`\nCheatsheet vs REGISTRY coverage: ${cheatsheetCoverage.passed} passed, ${cheatsheetCoverage.failed} failed`);
  if (cheatsheetCoverage.failed) console.log(cheatsheetCoverage.failures.join('\n\n'));

  console.log(`\nCommand-drill coverage: ${commandDrillCoverage.passed} passed, ${commandDrillCoverage.failed} failed`);
  if (commandDrillCoverage.failed) console.log(commandDrillCoverage.failures.join('\n\n'));

  console.log(
    `\nLesson content: ${lessons.totalDrills} story drills + ${lessons.totalPractice} practice drills ` +
      `= ${lessons.totalAll} total across ${lessons.lessonCount} lessons, ${lessons.failed} failed`
  );
  if (lessons.failed) console.log(lessons.failures.join('\n\n'));

  console.log(`\nDrill-commands hint tests: ${drillCommands.passed} passed, ${drillCommands.failed} failed`);
  if (drillCommands.failed) console.log(drillCommands.failures.join('\n\n'));

  console.log('\nRunning Python-track lesson tests (real Pyodide execution, this takes a few seconds)...');
  const py = await pythonLessons.run();
  console.log(`Python lesson content: ${py.totalDrills} drills across ${py.lessonCount} lessons, ${py.failed} failed`);
  if (py.failed) console.log(py.failures.join('\n\n'));

  const ok =
    engine.failed === 0 &&
    practiceEngine.failed === 0 &&
    vimEditor.failed === 0 &&
    lineEditor.failed === 0 &&
    cheatsheet.failed === 0 &&
    cheatsheetCoverage.failed === 0 &&
    commandDrillCoverage.failed === 0 &&
    lessons.failed === 0 &&
    drillCommands.failed === 0 &&
    py.failed === 0;
  console.log(ok ? '\nAll good. ✔' : '\nFAILURES DETECTED.');
  process.exit(ok ? 0 : 1);
})();
