// Async, unlike every other test module here — Python drills run through
// a real Pyodide worker_thread (pythonWorker.js), not the synchronous bash
// Shell. test/run.js awaits run() before reading the result.
const path = require('path');
const { Worker } = require('worker_threads');
const lessons = require(path.join(__dirname, '..', 'renderer', 'data', 'lessons-python', 'index.js'));

function callWorker(worker, id, code, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`worker timed out running drill (id ${id})`)), timeoutMs);
    const handler = (msg) => {
      if (msg.id !== id) return;
      clearTimeout(timer);
      worker.off('message', handler);
      resolve(msg);
    };
    worker.on('message', handler);
    worker.postMessage({ id, code });
  });
}

async function run() {
  const worker = new Worker(path.join(__dirname, '..', 'pythonWorker.js'));
  const failures = [];
  let totalDrills = 0;
  let passed = 0;
  let msgId = 0;

  try {
    for (const lesson of lessons) {
      const seenIds = new Set();
      for (const drill of lesson.drills) {
        totalDrills++;
        if (seenIds.has(drill.id)) failures.push(`[python ${lesson.id}] duplicate drill id "${drill.id}"`);
        seenIds.add(drill.id);
        if (![1, 2, 3].includes(drill.difficulty)) {
          failures.push(`[python ${lesson.id}/${drill.id}] invalid difficulty: ${drill.difficulty}`);
        }

        msgId++;
        let msg;
        try {
          msg = await callWorker(worker, msgId, drill.solution);
        } catch (e) {
          failures.push(`[python ${lesson.id}/${drill.id}] worker call failed: ${e.message}`);
          continue;
        }
        const result = { ok: msg.ok, stdout: msg.stdout || '', stderr: msg.stderr || '', error: msg.error, globals: msg.globals || {} };
        const ctx = { result, input: drill.solution };
        let ok;
        try {
          ok = !!drill.check(ctx);
        } catch (e) {
          failures.push(`[python ${lesson.id}/${drill.id}] check() threw: ${e.message}`);
          continue;
        }
        if (ok) {
          passed++;
        } else {
          failures.push(
            `[python ${lesson.id}/${drill.id}] solution did NOT satisfy check().\n  solution: ${JSON.stringify(drill.solution)}\n  result: ${JSON.stringify(result)}`
          );
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  return { totalDrills, lessonCount: lessons.length, passed, failed: failures.length, failures };
}

module.exports = { run };
