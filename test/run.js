const engine = require('./engine.test.js');
const practiceEngine = require('./practiceEngine.test.js');
const vimEditor = require('./vimEditor.test.js');
const lessons = require('./lessons.test.js');

console.log(`Engine tests: ${engine.passed} passed, ${engine.failed} failed`);
if (engine.failed) console.log(engine.failures.join('\n\n'));

console.log(`\nPractice engine tests: ${practiceEngine.passed} passed, ${practiceEngine.failed} failed`);
if (practiceEngine.failed) console.log(practiceEngine.failures.join('\n\n'));

console.log(`\nVim editor tests: ${vimEditor.passed} passed, ${vimEditor.failed} failed`);
if (vimEditor.failed) console.log(vimEditor.failures.join('\n\n'));

console.log(
  `\nLesson content: ${lessons.totalDrills} story drills + ${lessons.totalPractice} practice drills ` +
    `= ${lessons.totalAll} total across ${lessons.lessonCount} lessons, ${lessons.failed} failed`
);
if (lessons.failed) console.log(lessons.failures.join('\n\n'));

const ok = engine.failed === 0 && practiceEngine.failed === 0 && vimEditor.failed === 0 && lessons.failed === 0;
console.log(ok ? '\nAll good. ✔' : '\nFAILURES DETECTED.');
process.exit(ok ? 0 : 1);
