// Adaptive drill picker for "practice mode": endless, repeatable practice
// over a lesson's `practice` pool. Pure functions over a plain stats
// object so this is easy to unit-test and to persist inside progress.json.
'use strict';

function freshLessonStats() {
  return {
    targetDifficulty: 1,
    attemptCounter: 0,
    window: [], // rolling list of {correct, difficulty} for adaptive difficulty
    drillStats: {}, // drillId -> {seen, correct, streak, dueAtAttempt}
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// pool: array of drills (each has .id, .difficulty). stats: freshLessonStats() shape.
// rand: () => [0,1) — injectable for deterministic tests, defaults to Math.random.
function pickNext(pool, stats, rand = Math.random) {
  if (!pool.length) return null;
  const target = stats.targetDifficulty;
  const lastId = stats.lastDrillId;

  const due = pool.filter((d) => {
    const s = stats.drillStats[d.id];
    return s && s.dueAtAttempt <= stats.attemptCounter && d.id !== lastId;
  });
  const unseenAtTarget = pool.filter((d) => !stats.drillStats[d.id] && d.difficulty === target);
  const unseenNearTarget = pool.filter((d) => !stats.drillStats[d.id] && Math.abs(d.difficulty - target) <= 1);
  const unseenAny = pool.filter((d) => !stats.drillStats[d.id]);
  const others = pool.filter((d) => d.id !== lastId);

  const roll = rand();
  if (due.length && roll < 0.35) return pick(rand, due);
  if (unseenAtTarget.length && roll < 0.75) return pick(rand, unseenAtTarget);
  if (unseenNearTarget.length && roll < 0.9) return pick(rand, unseenNearTarget);
  if (unseenAny.length) return pick(rand, unseenAny);
  if (due.length) return pick(rand, due);
  return pick(rand, others.length ? others : pool);
}

const WINDOW_SIZE = 6;

function recordAttempt(stats, drill, correct) {
  stats.attemptCounter += 1;
  stats.lastDrillId = drill.id;

  if (!stats.drillStats[drill.id]) {
    stats.drillStats[drill.id] = { seen: 0, correct: 0, streak: 0, dueAtAttempt: 0 };
  }
  const s = stats.drillStats[drill.id];
  s.seen += 1;
  if (correct) {
    s.correct += 1;
    s.streak += 1;
    const interval = Math.min(s.streak, 6) * 3;
    s.dueAtAttempt = stats.attemptCounter + interval;
  } else {
    s.streak = 0;
    s.dueAtAttempt = stats.attemptCounter + 1;
  }

  stats.window.push({ correct, difficulty: drill.difficulty });
  if (stats.window.length > WINDOW_SIZE) stats.window.shift();

  if (stats.window.length >= WINDOW_SIZE) {
    const accuracy = stats.window.filter((w) => w.correct).length / stats.window.length;
    if (accuracy >= 0.8 && stats.targetDifficulty < 3) {
      stats.targetDifficulty += 1;
      stats.window = [];
    } else if (accuracy < 0.4 && stats.targetDifficulty > 1) {
      stats.targetDifficulty -= 1;
      stats.window = [];
    }
  }
}

function sessionAccuracy(stats) {
  const entries = Object.values(stats.drillStats);
  const seen = entries.reduce((sum, s) => sum + s.seen, 0);
  const correct = entries.reduce((sum, s) => sum + s.correct, 0);
  return seen ? correct / seen : 0;
}

function masteredCount(pool, stats) {
  return pool.filter((d) => {
    const s = stats.drillStats[d.id];
    return s && s.correct > 0;
  }).length;
}

module.exports = { freshLessonStats, pickNext, recordAttempt, sessionAccuracy, masteredCount };
