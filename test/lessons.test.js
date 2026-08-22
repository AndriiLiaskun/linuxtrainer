const path = require('path');
const { Shell } = require(path.join(__dirname, '..', 'renderer', 'shell', 'shell.js'));
const lessons = require(path.join(__dirname, '..', 'renderer', 'data', 'lessons', 'index.js'));

let totalDrills = 0;
const failures = [];

for (const lesson of lessons) {
  const shell = new Shell();
  for (const drill of lesson.drills) {
    totalDrills++;
    let result = null;
    if (!drill.quiz) result = shell.run(drill.solution);
    const ctx = { shell, fs: shell.fs, state: shell.state, result, input: drill.solution };
    let passed;
    try {
      passed = !!drill.check(ctx);
    } catch (e) {
      passed = false;
      failures.push(`[${lesson.id}/${drill.id}] check() threw: ${e.message}`);
      continue;
    }
    if (!passed) {
      failures.push(
        `[${lesson.id}/${drill.id}] solution "${drill.solution}" did NOT satisfy check().` +
          (result ? ` stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)} code=${result.code}` : ' (quiz)')
      );
    }
  }
}

module.exports = { totalDrills, lessonCount: lessons.length, failed: failures.length, failures };
