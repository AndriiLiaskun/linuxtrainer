const path = require('path');
const { Shell } = require(path.join(__dirname, '..', 'renderer', 'shell', 'shell.js'));
const lessons = require(path.join(__dirname, '..', 'renderer', 'data', 'lessons', 'index.js'));

let totalDrills = 0;
let totalPractice = 0;
const failures = [];

// Story-mode drills: sequential, share one Shell per lesson (later drills may
// depend on state left behind by earlier ones in the same lesson).
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
      failures.push(`[story ${lesson.id}/${drill.id}] check() threw: ${e.message}`);
      continue;
    }
    if (!passed) {
      failures.push(
        `[story ${lesson.id}/${drill.id}] solution "${drill.solution}" did NOT satisfy check().` +
          (result ? ` stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)} code=${result.code}` : ' (quiz)')
      );
    }
  }
}

// Practice-pool drills: independent — each gets its own fresh Shell so they
// can be shown/repeated in any order by the adaptive practice engine.
for (const lesson of lessons) {
  const pool = lesson.practice || [];
  const seenIds = new Set();
  for (const drill of pool) {
    totalPractice++;
    if (seenIds.has(drill.id)) {
      failures.push(`[practice ${lesson.id}] duplicate drill id "${drill.id}"`);
    }
    seenIds.add(drill.id);
    if (![1, 2, 3].includes(drill.difficulty)) {
      failures.push(`[practice ${lesson.id}/${drill.id}] invalid difficulty: ${drill.difficulty}`);
    }
    const shell = new Shell();
    let result = null;
    if (!drill.quiz) result = shell.run(drill.solution);
    const ctx = { shell, fs: shell.fs, state: shell.state, result, input: drill.solution };
    let passed;
    try {
      passed = !!drill.check(ctx);
    } catch (e) {
      passed = false;
      failures.push(`[practice ${lesson.id}/${drill.id}] check() threw: ${e.message}`);
      continue;
    }
    if (!passed) {
      failures.push(
        `[practice ${lesson.id}/${drill.id}] solution "${drill.solution}" did NOT satisfy check().` +
          (result ? ` stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)} code=${result.code}` : ' (quiz)')
      );
    }
  }
}

module.exports = {
  totalDrills,
  totalPractice,
  totalAll: totalDrills + totalPractice,
  lessonCount: lessons.length,
  failed: failures.length,
  failures,
};
