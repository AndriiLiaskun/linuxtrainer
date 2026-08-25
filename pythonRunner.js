// Main-process manager for the Python execution worker (pythonWorker.js).
// Owns a single persistent worker_thread, tracks in-flight requests by id,
// and enforces a hard wall-clock timeout so a student script that hangs
// (e.g. `while True: pass`) can never freeze the app forever — the stuck
// worker gets terminated and a fresh one takes over for the next run.
'use strict';

const { Worker } = require('worker_threads');
const path = require('path');

const RUN_TIMEOUT_MS = 10000;

class PythonRunner {
  constructor() {
    this.worker = null;
    this.pending = new Map(); // id -> { resolve, timer }
    this.nextId = 1;
  }

  _spawnWorker() {
    const worker = new Worker(path.join(__dirname, 'pythonWorker.js'));
    worker.on('message', (msg) => {
      const p = this.pending.get(msg.id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(msg.id);
      p.resolve(msg);
    });
    worker.on('error', (err) => {
      // Worker crashed outright (not a timeout) — fail whatever was
      // in flight on it and drop the reference so the next run() spawns
      // a clean replacement.
      for (const [, p] of this.pending) {
        clearTimeout(p.timer);
        p.resolve({ ok: false, stdout: '', stderr: '', error: 'internal error: ' + err.message });
      }
      this.pending.clear();
      if (this.worker === worker) this.worker = null;
    });
    this.worker = worker;
    return worker;
  }

  run(code) {
    if (!this.worker) this._spawnWorker();
    const worker = this.worker;
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({
          ok: false,
          stdout: '',
          stderr: '',
          error: 'Виконання перевищило ліміт часу (10с) — імовірно, нескінченний цикл.',
          timedOut: true,
        });
        // Kill the stuck worker so it can't keep hogging the thread, and
        // clear the reference so the NEXT run() spawns a fresh one.
        worker.terminate().catch(() => {});
        if (this.worker === worker) this.worker = null;
      }, RUN_TIMEOUT_MS);
      this.pending.set(id, { resolve, timer });
      worker.postMessage({ id, code });
    });
  }
}

module.exports = { PythonRunner };
