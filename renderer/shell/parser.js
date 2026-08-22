// Tokenizer, variable/glob expansion, and a very small control-flow
// preprocessor (for-loops, if/test) for the drill shell.
'use strict';

// ---- tokenizer ---------------------------------------------------------
// Each token is { v: string, noExpand: boolean } — noExpand is true only
// when the token was built purely from a single-quoted run (real bash
// semantics: single quotes suppress $ expansion, double quotes don't).

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const n = input.length;
  let cur = '';
  let touched = false;
  let sawUnquotedOrDouble = false;
  let sawOnlySingle = false;
  let hadAnyQuote = false;

  function push() {
    if (touched) {
      tokens.push({ v: cur, noExpand: sawOnlySingle && !sawUnquotedOrDouble, quoted: hadAnyQuote });
    }
    cur = '';
    touched = false;
    sawUnquotedOrDouble = false;
    sawOnlySingle = false;
    hadAnyQuote = false;
  }

  while (i < n) {
    const c = input[i];
    if (c === ' ' || c === '\t') {
      push();
      i++;
      continue;
    }
    if (c === "'") {
      touched = true;
      sawOnlySingle = true;
      hadAnyQuote = true;
      i++;
      while (i < n && input[i] !== "'") {
        cur += input[i];
        i++;
      }
      i++;
      continue;
    }
    if (c === '"') {
      touched = true;
      sawUnquotedOrDouble = true;
      hadAnyQuote = true;
      i++;
      while (i < n && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < n && (input[i + 1] === '"' || input[i + 1] === '$' || input[i + 1] === '\\')) {
          cur += input[i + 1];
          i += 2;
          continue;
        }
        cur += input[i];
        i++;
      }
      i++;
      continue;
    }
    if (c === '$' && input[i + 1] === '(') {
      touched = true;
      sawUnquotedOrDouble = true;
      let depth = 1;
      let j = i + 2;
      let inner = '$(';
      while (j < n && depth > 0) {
        if (input[j] === '(') depth++;
        else if (input[j] === ')') depth--;
        inner += input[j];
        j++;
      }
      cur += inner;
      i = j;
      continue;
    }
    if (c === '|' && input[i + 1] === '|') {
      push();
      tokens.push({ v: '||', op: true });
      i += 2;
      continue;
    }
    if (c === '&' && input[i + 1] === '&') {
      push();
      tokens.push({ v: '&&', op: true });
      i += 2;
      continue;
    }
    if (c === '>' && input[i + 1] === '>') {
      push();
      tokens.push({ v: '>>', op: true });
      i += 2;
      continue;
    }
    if ('|;<>&'.includes(c)) {
      push();
      tokens.push({ v: c, op: true });
      i++;
      continue;
    }
    if (c === '\\' && i + 1 < n) {
      touched = true;
      sawUnquotedOrDouble = true;
      cur += input[i + 1];
      i += 2;
      continue;
    }
    touched = true;
    sawUnquotedOrDouble = true;
    cur += c;
    i++;
  }
  push();
  return tokens;
}

// ---- variable / command-substitution expansion -------------------------

function expandVariables(word, env, runInline) {
  let out = '';
  let i = 0;
  const n = word.length;
  while (i < n) {
    const c = word[i];
    if (c === '$' && word[i + 1] === '(') {
      let depth = 1;
      let j = i + 2;
      while (j < n && depth > 0) {
        if (word[j] === '(') depth++;
        else if (word[j] === ')') depth--;
        if (depth > 0) j++;
      }
      const inner = word.slice(i + 2, j);
      out += runInline ? runInline(inner) : '';
      i = j + 1;
      continue;
    }
    if (c === '$' && word[i + 1] === '{') {
      let j = word.indexOf('}', i + 2);
      if (j === -1) j = n;
      const name = word.slice(i + 2, j);
      out += env[name] !== undefined ? env[name] : '';
      i = j + 1;
      continue;
    }
    if (c === '$' && /[A-Za-z_]/.test(word[i + 1] || '')) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(word[j])) j++;
      const name = word.slice(i + 1, j);
      out += env[name] !== undefined ? env[name] : '';
      i = j;
      continue;
    }
    if (c === '$' && word[i + 1] === '?') {
      out += String(env.__exitCode !== undefined ? env.__exitCode : 0);
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// ---- glob expansion (simple * and ? within final path segment) --------

function globExpand(word, fs) {
  if (!/[*?]/.test(word)) return [word];
  const isAbs = word.startsWith('/');
  const parts = word.split('/');
  const lastIdx = parts.length - 1;
  const dirPart = parts.slice(0, lastIdx).join('/') || (isAbs ? '/' : '.');
  const pattern = parts[lastIdx];
  if (!/[*?]/.test(pattern)) return [word];

  const dirPath = isAbs ? (dirPart || '/') : dirPart;
  let node;
  try {
    node = fs.getNode(dirPath === '.' ? fs.cwd : dirPath);
  } catch (e) {
    node = null;
  }
  if (!node || node.type !== 'dir') return [word];

  const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  const names = Array.from(node.children.keys()).filter((name) => !name.startsWith('.') && regex.test(name)).sort();
  if (names.length === 0) return [word];
  const prefix = dirPart === (isAbs ? '/' : '.') ? (isAbs ? '/' : '') : dirPart + '/';
  return names.map((name) => prefix + name);
}

// ---- split into pipeline segments & sequencing operators --------------

function splitSequence(tokens) {
  const segments = [];
  let cur = [];
  for (const t of tokens) {
    if (t.op && (t.v === '&&' || t.v === '||' || t.v === ';')) {
      segments.push({ tokens: cur, sep: t.v });
      cur = [];
    } else {
      cur.push(t);
    }
  }
  segments.push({ tokens: cur, sep: null });
  return segments.filter((s) => s.tokens.length > 0 || s.sep);
}

function splitPipes(tokens) {
  const stages = [];
  let cur = [];
  for (const t of tokens) {
    if (t.op && t.v === '|') {
      stages.push(cur);
      cur = [];
    } else {
      cur.push(t);
    }
  }
  stages.push(cur);
  return stages;
}

function extractRedirects(tokens) {
  const out = [];
  let stdoutFile = null;
  let stdoutAppend = false;
  let stderrFile = null;
  let stderrAppend = false;
  let combinedFile = null;
  let combinedAppend = false;
  let stdinFile = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.op && (t.v === '>' || t.v === '>>')) {
      // "2>file"/"2>>file" (stderr) and "&>file"/"&>>file" (both streams) tokenize
      // as a plain word ("2" or "&") immediately followed by this operator —
      // there is no way to tell that apart from a genuine standalone argument
      // "2"/"&", so we treat that adjacency as always meaning a redirect
      // (fine for a training shell; real bash resolves this via lexing, not us).
      const prev = out[out.length - 1];
      const append = t.v === '>>';
      if (prev && !prev.op && !prev.noExpand && prev.v === '2') {
        out.pop();
        stderrFile = tokens[i + 1] ? tokens[i + 1].v : undefined;
        stderrAppend = append;
      } else if (prev && prev.v === '&') {
        out.pop();
        combinedFile = tokens[i + 1] ? tokens[i + 1].v : undefined;
        combinedAppend = append;
      } else {
        stdoutFile = tokens[i + 1] ? tokens[i + 1].v : undefined;
        stdoutAppend = append;
      }
      i++;
      continue;
    }
    if (t.op && t.v === '<') {
      stdinFile = tokens[i + 1] ? tokens[i + 1].v : undefined;
      i++;
      continue;
    }
    out.push(t);
  }
  return { args: out, stdoutFile, stdoutAppend, stderrFile, stderrAppend, combinedFile, combinedAppend, stdinFile };
}

module.exports = {
  tokenize,
  expandVariables,
  globExpand,
  splitSequence,
  splitPipes,
  extractRedirects,
};
