// Runs inside a Node worker_thread (spawned by main.js) so a runaway
// student script (e.g. `while True: pass`) can be killed by terminating
// this worker without freezing the main process / the whole app.
//
// Pyodide MUST run here, not in the renderer: its internal pyodide.asm.mjs
// does a dynamic `require('node:fs')` inside an ES module that Electron's
// renderer rejects ("Dynamic require of 'node:fs' is not supported"),
// even with nodeIntegration on. A plain Node worker_thread has no such
// restriction (verified via a throwaway spike before writing this).
'use strict';

const { parentPort } = require('worker_threads');
const path = require('path');
const { Shell } = require('./renderer/shell/shell.js');

let pyodidePromise = null;
async function getPyodide() {
  if (!pyodidePromise) {
    const { loadPyodide } = require(path.join(__dirname, 'node_modules', 'pyodide', 'pyodide.js'));
    pyodidePromise = loadPyodide();
  }
  return pyodidePromise;
}

// Sentinel: means "this value cannot be safely captured" — distinct from
// `undefined`, which is a legitimate JS value some drills may check for.
const UNCONVERTIBLE = Symbol('unconvertible');

// Best-effort conversion of a Pyodide global's value into plain,
// structured-clone-safe JS. Primitives (int/str/bool/None) already arrive
// as plain JS values with no .toJs method. list/dict/tuple/set convert
// cleanly via .toJs(). A custom class instance (e.g. our own
// CompletedProcess) has NO known conversion, so Pyodide's toJs() just
// hands back the SAME live PyProxy unchanged — detected here by checking
// whether the "converted" result still exposes .toJs itself, and treated
// as unconvertible rather than posted (a live PyProxy can't cross the
// worker->main postMessage boundary — structured clone throws on it).
function toPlainJs(pyValue) {
  if (pyValue && typeof pyValue.toJs === 'function') {
    let converted;
    try {
      converted = pyValue.toJs({ dict_converter: Object.fromEntries });
    } catch (e) {
      return UNCONVERTIBLE;
    }
    if (converted && typeof converted.toJs === 'function') return UNCONVERTIBLE;
    return converted;
  }
  return pyValue;
}

// Names Pyodide/CPython populate by default — never surfaced as "student
// globals" in the result, so check() functions only see what the drill's
// own code actually defined.
const BUILTIN_GLOBAL_NAMES = new Set(['__name__', '__doc__', '__package__', '__loader__', '__spec__', '__annotations__', '__builtins__', '__file__']);

// Exposes Python's subprocess.run()/check_output() as a thin shim that
// calls back into a virtual bash Shell (renderer/shell/shell.js) — the
// same engine the Linux lessons use — instead of a real process. The
// Shell instance is rebound fresh per SCRIPT execution (see runPython()
// below) but shared across every subprocess call WITHIN that one script,
// so e.g. `subprocess.run(['touch','a.txt'])` followed by
// `subprocess.run(['ls'])` in the same submission see consistent state —
// only rebindPythonShell() creates a new Shell, not each subprocess call.
function installSubprocessShim(pyodide) {
  pyodide.runPython(`
import sys as _sys
import types as _types

class CompletedProcess:
    def __init__(self, args, returncode, stdout, stderr):
        self.args = args
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

class CalledProcessError(Exception):
    def __init__(self, returncode, cmd, output=None, stderr=None):
        self.returncode = returncode
        self.cmd = cmd
        self.output = output
        self.stderr = stderr
        super().__init__(f"Command '{cmd}' returned non-zero exit status {returncode}.")

def _cmdline(args):
    return args if isinstance(args, str) else ' '.join(str(a) for a in args)

def run(args, capture_output=True, text=True, shell=False, check=False, **kwargs):
    r = __js_shell_run(_cmdline(args))
    proc = CompletedProcess(args, r.code, r.stdout, r.stderr)
    if check and proc.returncode != 0:
        raise CalledProcessError(proc.returncode, args, proc.stdout, proc.stderr)
    return proc

def check_output(args, text=True, shell=False, **kwargs):
    r = __js_shell_run(_cmdline(args))
    if r.code != 0:
        raise CalledProcessError(r.code, args, r.stdout, r.stderr)
    return r.stdout

def call(args, shell=False, **kwargs):
    r = __js_shell_run(_cmdline(args))
    return r.code

_subprocess_shim = _types.ModuleType('subprocess')
_subprocess_shim.run = run
_subprocess_shim.check_output = check_output
_subprocess_shim.call = call
_subprocess_shim.CompletedProcess = CompletedProcess
_subprocess_shim.CalledProcessError = CalledProcessError
_subprocess_shim.PIPE = -1
_sys.modules['subprocess'] = _subprocess_shim
`);
}

let subprocessShimInstalled = false;

async function runPython(code) {
  const pyodide = await getPyodide();
  if (!subprocessShimInstalled) {
    installSubprocessShim(pyodide);
    subprocessShimInstalled = true;
  }
  // One fresh Shell per script submission, shared by every subprocess.run()
  // call the script makes (not recreated per call — see installSubprocessShim).
  const scriptShell = new Shell();
  pyodide.globals.set('__js_shell_run', (cmdline) => {
    const r = scriptShell.run(cmdline);
    return { code: r.code, stdout: r.stdout, stderr: r.stderr };
  });

  let stdout = '';
  let stderr = '';
  pyodide.setStdout({ batched: (s) => { stdout += s + '\n'; } });
  pyodide.setStderr({ batched: (s) => { stderr += s + '\n'; } });

  // Fresh globals per run so one drill attempt can't see another's
  // leftover variables/state (mirrors a fresh Shell() per bash drill).
  const globalsDict = pyodide.globals.get('dict')();
  try {
    pyodide.runPython(code, { globals: globalsDict });
    const globals = {};
    // globalsDict is a PyProxy over a Python dict — Pyodide gives dict-like
    // PyProxies the JS Map interface directly, so .keys() here is a plain
    // JS Map method call, not a Python attribute lookup.
    const names = Array.from(globalsDict.keys());
    for (const name of names) {
      if (BUILTIN_GLOBAL_NAMES.has(name) || name.startsWith('__')) continue;
      let val;
      try {
        val = globalsDict.get(name);
      } catch (e) {
        continue;
      }
      const pyType = val && val.type;
      if (pyType === 'module' || pyType === 'function' || typeof val === 'function') {
        if (val && typeof val.destroy === 'function') val.destroy();
        continue;
      }
      try {
        const plain = toPlainJs(val);
        if (plain === UNCONVERTIBLE) continue;
        // Belt-and-braces: a JSON round-trip dry run before trusting
        // anything crosses the worker->main postMessage boundary — plain
        // data always survives it, so this only ever drops genuinely
        // unsafe values instead of letting one bad global crash the
        // whole result at postMessage() time.
        JSON.stringify(plain);
        globals[name] = plain;
      } catch (e) {
        // unconvertible/non-cloneable — silently omitted from the result
      } finally {
        if (val && typeof val.destroy === 'function') val.destroy();
      }
    }
    return { ok: true, stdout, stderr, globals };
  } catch (e) {
    return { ok: false, stdout, stderr, error: e.message };
  } finally {
    globalsDict.destroy();
  }
}

parentPort.on('message', async ({ id, code }) => {
  try {
    const result = await runPython(code);
    parentPort.postMessage({ id, ...result });
  } catch (e) {
    parentPort.postMessage({ id, ok: false, stdout: '', stderr: '', error: e.message || String(e) });
  }
});
