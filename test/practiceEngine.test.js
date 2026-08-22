const path = require('path');
const { freshLessonStats, pickNext, recordAttempt, sessionAccuracy } = require(
  path.join(__dirname, '..', 'renderer', 'practiceEngine.js')
);

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

function pool(n, difficulty) {
  return Array.from({ length: n }, (_, i) => ({ id: `d${difficulty}-${i}`, difficulty }));
}

// --- difficulty escalates after a streak of correct answers ---
{
  const bigPool = [...pool(20, 1), ...pool(20, 2), ...pool(20, 3)];
  const stats = freshLessonStats();
  for (let i = 0; i < 6; i++) {
    const drill = pickNext(bigPool, stats, () => 0.5);
    recordAttempt(stats, drill, true);
  }
  check('difficulty escalates after 6/6 correct', stats.targetDifficulty, 2);
}

// --- difficulty de-escalates after a streak of wrong answers ---
{
  const bigPool = [...pool(20, 1), ...pool(20, 2), ...pool(20, 3)];
  const stats = freshLessonStats();
  stats.targetDifficulty = 2;
  for (let i = 0; i < 6; i++) {
    const drill = pickNext(bigPool, stats, () => 0.95);
    recordAttempt(stats, drill, false);
  }
  check('difficulty de-escalates after 6/6 wrong', stats.targetDifficulty, 1);
}

// --- a wrong answer becomes due again soon ---
{
  const bigPool = pool(50, 1);
  const stats = freshLessonStats();
  const first = pickNext(bigPool, stats, () => 0.99); // forces "unseenAny" branch deterministically-ish
  recordAttempt(stats, first, false);
  const dueAt = stats.drillStats[first.id].dueAtAttempt;
  check('wrong answer is due almost immediately', dueAt, stats.attemptCounter + 1);
}

// --- correct answers push the same drill's due point further out each time ---
{
  const bigPool = pool(50, 1);
  const stats = freshLessonStats();
  const d = bigPool[0];
  recordAttempt(stats, d, true);
  const due1 = stats.drillStats[d.id].dueAtAttempt;
  recordAttempt(stats, d, true);
  const due2 = stats.drillStats[d.id].dueAtAttempt;
  check('repeated correct answers increase the review interval', due2 > due1, true);
}

// --- never picks the same drill twice in a row when alternatives exist ---
{
  const bigPool = pool(10, 1);
  const stats = freshLessonStats();
  let prev = null;
  let sameTwiceInARow = false;
  for (let i = 0; i < 30; i++) {
    const drill = pickNext(bigPool, stats, () => (i % 7) / 7);
    if (prev && drill.id === prev.id) sameTwiceInARow = true;
    recordAttempt(stats, drill, i % 3 !== 0);
    prev = drill;
  }
  check('avoids immediate repeats when pool has alternatives', sameTwiceInARow, false);
}

// --- sessionAccuracy reflects correct/seen ratio ---
{
  const bigPool = pool(5, 1);
  const stats = freshLessonStats();
  recordAttempt(stats, bigPool[0], true);
  recordAttempt(stats, bigPool[1], false);
  recordAttempt(stats, bigPool[2], true);
  check('sessionAccuracy computes correct/seen', sessionAccuracy(stats), 2 / 3);
}

// --- pickNext returns null for an empty pool, never throws ---
{
  const stats = freshLessonStats();
  check('pickNext on empty pool returns null', pickNext([], stats), null);
}

module.exports = { passed, failed, failures };
