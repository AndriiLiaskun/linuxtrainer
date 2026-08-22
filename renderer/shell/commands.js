// Command implementations for the drill shell.
// Every command is `(args, ctx) => { stdout, stderr, code }`
// ctx = { fs, state, stdin, env, run, cwdBefore }
'use strict';

const { ShellError } = require('./filesystem');
const { AVAILABLE_PACKAGES } = require('./state');

function ok(stdout = '') {
  return { stdout, stderr: '', code: 0 };
}
function fail(stderr, code = 1) {
  return { stdout: '', stderr, code };
}

function parseFlags(args, boolFlags, valueFlags = []) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') {
      rest.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const body = a.slice(2);
      const eq = body.indexOf('=');
      if (eq !== -1) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
      } else if (valueFlags.includes(body)) {
        flags[body] = args[++i];
      } else {
        flags[body] = true;
      }
      continue;
    }
    if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) {
      const body = a.slice(1);
      // Full-name match first: handles single-dash long flags (find -name, awk -F).
      if (valueFlags.includes(body)) {
        flags[body] = args[++i];
        continue;
      }
      if (body.length > 1 && boolFlags.includes(body)) {
        flags[body] = true;
        continue;
      }
      // Bundle of single-character short flags (e.g. -rf, -la, -d,).
      let j = 0;
      while (j < body.length) {
        const ch = body[j];
        if (valueFlags.includes(ch)) {
          const remainder = body.slice(j + 1);
          flags[ch] = remainder.length ? remainder : args[++i];
          break;
        }
        flags[ch] = true;
        j++;
      }
      continue;
    }
    rest.push(a);
  }
  return { flags, rest };
}

// ---------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------

function cmd_pwd(args, ctx) {
  return ok(ctx.fs.cwd + '\n');
}

function cmd_cd(args, ctx) {
  const target = args[0] || ctx.fs.env.HOME;
  try {
    ctx.fs.chdir(target);
    return ok('');
  } catch (e) {
    return fail((e.message || 'cd: error') + '\n');
  }
}

function fmtEntry(node, flags, name) {
  if (!flags.l) return name;
  const { FileSystem } = require('./filesystem');
  const perms = FileSystem.modeString(node);
  const size = node.type === 'dir' ? 4096 : (node.type === 'file' ? node.content.length : node.target.length);
  return `${perms} 1 ${node.owner} ${node.group} ${String(size).padStart(5)} ${node.mtime} ${name}`;
}

function cmd_ls(args, ctx) {
  const { flags, rest } = parseFlags(args, ['a', 'l', 'h', 'la', 'al', 'A', 'R', '1']);
  const showAll = flags.a || flags.A || flags.la || flags.al;
  const long = flags.l || flags.la || flags.al;
  const targets = rest.length ? rest : ['.'];
  const outputs = [];
  for (const t of targets) {
    let node;
    try {
      node = ctx.fs.getNode(t);
    } catch (e) {
      outputs.push(`ls: cannot access '${t}': No such file or directory`);
      continue;
    }
    if (!node) {
      outputs.push(`ls: cannot access '${t}': No such file or directory`);
      continue;
    }
    if (node.type !== 'dir') {
      outputs.push(fmtEntry(node, { l: long }, t));
      continue;
    }
    let names = Array.from(node.children.keys()).sort();
    const entries = [];
    if (showAll) entries.push(['.', node], ['..', node]);
    for (const name of names) {
      if (!showAll && name.startsWith('.')) continue;
      entries.push([name, node.children.get(name)]);
    }
    if (long) {
      const lines = entries.map(([name, n]) => fmtEntry(n, { l: true }, n.type === 'dir' && name !== '.' && name !== '..' ? name : name));
      outputs.push((targets.length > 1 ? `${t}:\n` : '') + 'total ' + entries.length + '\n' + lines.join('\n'));
    } else {
      const names2 = entries.map(([name]) => name);
      outputs.push((targets.length > 1 ? `${t}:\n` : '') + names2.join('  '));
    }
  }
  const stderrLines = outputs.filter((o) => o.startsWith('ls: '));
  const stdoutLines = outputs.filter((o) => !o.startsWith('ls: '));
  return {
    stdout: stdoutLines.length ? stdoutLines.join('\n\n') + '\n' : '',
    stderr: stderrLines.length ? stderrLines.join('\n') + '\n' : '',
    code: stderrLines.length ? 1 : 0,
  };
}

function treeLines(fs, node, prefix, showAll) {
  const lines = [];
  const names = Array.from(node.children.keys())
    .filter((n) => showAll || !n.startsWith('.'))
    .sort();
  names.forEach((name, idx) => {
    const child = node.children.get(name);
    const last = idx === names.length - 1;
    lines.push(prefix + (last ? '└── ' : '├── ') + name + (child.type === 'dir' ? '/' : ''));
    if (child.type === 'dir') {
      lines.push(...treeLines(fs, child, prefix + (last ? '    ' : '│   '), showAll));
    }
  });
  return lines;
}

function cmd_tree(args, ctx) {
  const { flags, rest } = parseFlags(args, ['a']);
  const path = rest[0] || '.';
  const node = ctx.fs.getNode(path);
  if (!node || node.type !== 'dir') return fail(`tree: ${path}: No such file or directory\n`);
  const lines = treeLines(ctx.fs, node, '', flags.a);
  return ok(path + '\n' + lines.join('\n') + '\n');
}

// ---------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------

function cmd_touch(args, ctx) {
  if (!args.length) return fail("touch: missing file operand\n");
  for (const a of args) {
    try {
      ctx.fs.touch(a);
    } catch (e) {
      return fail(e.message + '\n');
    }
  }
  return ok('');
}

function cmd_mkdir(args, ctx) {
  const { flags, rest } = parseFlags(args, ['p', 'parents']);
  if (!rest.length) return fail('mkdir: missing operand\n');
  for (const a of rest) {
    try {
      ctx.fs.mkdir(a, { parents: !!(flags.p || flags.parents) });
    } catch (e) {
      return fail(e.message + '\n');
    }
  }
  return ok('');
}

function cmd_rm(args, ctx) {
  const { flags, rest } = parseFlags(args, ['r', 'R', 'f', 'recursive', 'force', 'rf', 'fr']);
  const recursive = flags.r || flags.R || flags.recursive || flags.rf || flags.fr;
  const force = flags.f || flags.force || flags.rf || flags.fr;
  if (!rest.length) return fail('rm: missing operand\n');
  for (const a of rest) {
    try {
      ctx.fs.remove(a, { recursive: !!recursive, force: !!force });
    } catch (e) {
      if (force) continue;
      return fail(e.message + '\n');
    }
  }
  return ok('');
}

function cmd_rmdir(args, ctx) {
  if (!args.length) return fail('rmdir: missing operand\n');
  for (const a of args) {
    try {
      ctx.fs.rmdir(a);
    } catch (e) {
      return fail(e.message + '\n');
    }
  }
  return ok('');
}

function cmd_cp(args, ctx) {
  const { flags, rest } = parseFlags(args, ['r', 'R', 'recursive']);
  const recursive = flags.r || flags.R || flags.recursive;
  if (rest.length < 2) return fail('cp: missing file operand\n');
  const dest = rest[rest.length - 1];
  const srcs = rest.slice(0, -1);
  for (const s of srcs) {
    try {
      ctx.fs.copy(s, dest, { recursive: !!recursive });
    } catch (e) {
      return fail(e.message + '\n');
    }
  }
  return ok('');
}

function cmd_mv(args, ctx) {
  if (args.length < 2) return fail('mv: missing file operand\n');
  const dest = args[args.length - 1];
  const srcs = args.slice(0, -1);
  for (const s of srcs) {
    try {
      ctx.fs.move(s, dest);
    } catch (e) {
      return fail(e.message + '\n');
    }
  }
  return ok('');
}

function cmd_ln(args, ctx) {
  const { flags, rest } = parseFlags(args, ['s', 'symbolic']);
  if (!(flags.s || flags.symbolic)) return fail('ln: hard links are not supported in this sandbox, use -s\n');
  if (rest.length < 2) return fail('ln: missing file operand\n');
  try {
    ctx.fs.symlink(rest[0], rest[1]);
    return ok('');
  } catch (e) {
    return fail(e.message + '\n');
  }
}

function readFileOrErr(fs, path, cmdName) {
  const node = fs.getNode(path);
  if (!node) throw new ShellError(`${cmdName}: ${path}: No such file or directory`);
  if (node.type === 'dir') throw new ShellError(`${cmdName}: ${path}: Is a directory`);
  return node.content;
}

function cmd_cat(args, ctx) {
  const { flags, rest } = parseFlags(args, ['n']);
  if (!rest.length) {
    let text = ctx.stdin || '';
    if (flags.n) text = numberLines(text);
    return ok(text);
  }
  let out = '';
  for (const a of rest) {
    try {
      let content = readFileOrErr(ctx.fs, a, 'cat');
      out += content;
    } catch (e) {
      return { stdout: out, stderr: e.message + '\n', code: 1 };
    }
  }
  if (flags.n) out = numberLines(out);
  return ok(out);
}

function numberLines(text) {
  const lines = text.split('\n');
  const hasTrailingNewline = text.endsWith('\n');
  const body = hasTrailingNewline ? lines.slice(0, -1) : lines;
  const numbered = body.map((l, i) => `${String(i + 1).padStart(6)}\t${l}`).join('\n');
  return numbered + (hasTrailingNewline ? '\n' : '');
}

function cmd_less(args, ctx) {
  return cmd_cat(args, ctx);
}

function cmd_echo(args, ctx) {
  const { flags, rest } = parseFlags(args, ['n', 'e']);
  const text = rest.join(' ');
  return ok(text + (flags.n ? '' : '\n'));
}

function cmd_head(args, ctx) {
  const { flags, rest } = parseFlags(args, [], ['n']);
  const n = flags.n ? parseInt(flags.n, 10) : 10;
  const source = rest.length ? readTargets(ctx.fs, rest, 'head') : { text: ctx.stdin || '', err: null };
  if (source.err) return fail(source.err + '\n');
  const lines = source.text.split('\n');
  const trailing = source.text.endsWith('\n');
  const body = trailing ? lines.slice(0, -1) : lines;
  const out = body.slice(0, n).join('\n') + (body.length ? '\n' : '');
  return ok(out);
}

function cmd_tail(args, ctx) {
  const { flags, rest } = parseFlags(args, ['f'], ['n']);
  const n = flags.n ? parseInt(flags.n, 10) : 10;
  const source = rest.length ? readTargets(ctx.fs, rest, 'tail') : { text: ctx.stdin || '', err: null };
  if (source.err) return fail(source.err + '\n');
  const lines = source.text.split('\n');
  const trailing = source.text.endsWith('\n');
  const body = trailing ? lines.slice(0, -1) : lines;
  const out = body.slice(-n).join('\n') + (body.length ? '\n' : '');
  return ok(out + (flags.f ? '' : ''));
}

function readTargets(fs, targets, cmdName) {
  let text = '';
  for (const t of targets) {
    try {
      text += readFileOrErr(fs, t, cmdName);
    } catch (e) {
      return { text: '', err: e.message };
    }
  }
  return { text, err: null };
}

function cmd_wc(args, ctx) {
  const { flags, rest } = parseFlags(args, ['l', 'w', 'c']);
  const showAll = !flags.l && !flags.w && !flags.c;
  const targets = rest.length ? rest : null;
  const compute = (text) => {
    const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;
    return { lines, words, chars };
  };
  const formatRow = (c, label) => {
    const parts = [];
    if (showAll || flags.l) parts.push(String(c.lines).padStart(7));
    if (showAll || flags.w) parts.push(String(c.words).padStart(7));
    if (showAll || flags.c) parts.push(String(c.chars).padStart(7));
    return parts.join('') + (label ? ' ' + label : '');
  };
  if (!targets) {
    const c = compute(ctx.stdin || '');
    return ok(formatRow(c, '').trimStart() + '\n');
  }
  let out = [];
  let total = { lines: 0, words: 0, chars: 0 };
  for (const t of targets) {
    try {
      const text = readFileOrErr(ctx.fs, t, 'wc');
      const c = compute(text);
      total.lines += c.lines;
      total.words += c.words;
      total.chars += c.chars;
      out.push(formatRow(c, t));
    } catch (e) {
      return fail(e.message + '\n');
    }
  }
  if (targets.length > 1) out.push(formatRow(total, 'total'));
  return ok(out.join('\n') + '\n');
}

function cmd_file(args, ctx) {
  if (!args.length) return fail('file: missing operand\n');
  const out = args.map((a) => {
    const node = ctx.fs.getNode(a);
    if (!node) return `${a}: cannot open (No such file or directory)`;
    if (node.type === 'dir') return `${a}: directory`;
    if (node.type === 'symlink') return `${a}: symbolic link to ${node.target}`;
    if (node.executable) return `${a}: executable script`;
    return `${a}: ASCII text`;
  });
  return ok(out.join('\n') + '\n');
}

function cmd_stat(args, ctx) {
  if (!args.length) return fail('stat: missing operand\n');
  const { FileSystem } = require('./filesystem');
  const out = [];
  for (const a of args) {
    const node = ctx.fs.getNode(a);
    if (!node) return fail(`stat: cannot stat '${a}': No such file or directory\n`);
    const size = node.type === 'file' ? node.content.length : 4096;
    out.push(
      `  File: ${a}\n  Size: ${size}\t\tType: ${node.type}\n` +
        `Access: (${node.mode.toString(8).padStart(4, '0')}/${FileSystem.modeString(node)})  Uid: (${node.owner})   Gid: (${node.group})\n` +
        `Modify: ${node.mtime}`
    );
  }
  return ok(out.join('\n\n') + '\n');
}

// ---------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------

function parseSymbolicMode(spec, currentMode) {
  let mode = currentMode;
  for (const clause of spec.split(',')) {
    const m = clause.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
    if (!m) return null;
    let [, who, op, perms] = m;
    if (!who) who = 'a';
    const bits = { r: 4, w: 2, x: 1 };
    let val = 0;
    for (const p of perms) val |= bits[p];
    const apply = (shift) => {
      const cur = (mode >> shift) & 7;
      if (op === '+') return mode | (val << shift);
      if (op === '-') return mode & ~(val << shift);
      return (mode & ~(7 << shift)) | (val << shift);
    };
    if (who.includes('u') || who.includes('a')) mode = apply(6);
    if (who.includes('g') || who.includes('a')) mode = apply(3);
    if (who.includes('o') || who.includes('a')) mode = apply(0);
  }
  return mode;
}

function cmd_chmod(args, ctx) {
  const { flags, rest } = parseFlags(args, ['R', 'recursive']);
  if (rest.length < 2) return fail('chmod: missing operand\n');
  const spec = rest[0];
  const targets = rest.slice(1);
  const applyOne = (path) => {
    const node = ctx.fs.getNode(path);
    if (!node) throw new ShellError(`chmod: cannot access '${path}': No such file or directory`);
    let newMode;
    if (/^[0-7]{3,4}$/.test(spec)) {
      newMode = parseInt(spec, 8);
    } else {
      newMode = parseSymbolicMode(spec, node.mode);
      if (newMode === null) throw new ShellError(`chmod: invalid mode: '${spec}'`);
    }
    node.mode = newMode;
    if (node.type === 'dir' && (flags.R || flags.recursive)) {
      for (const name of node.children.keys()) applyOne(path.replace(/\/$/, '') + '/' + name);
    }
  };
  for (const t of targets) {
    try {
      applyOne(t);
    } catch (e) {
      return fail(e.message + '\n');
    }
  }
  return ok('');
}

function cmd_chown(args, ctx) {
  if (args.length < 2) return fail('chown: missing operand\n');
  const spec = args[0];
  const [owner, group] = spec.split(':');
  for (const t of args.slice(1)) {
    try {
      ctx.fs.chown(t, owner, group);
    } catch (e) {
      return fail(e.message + '\n');
    }
  }
  return ok('');
}

function cmd_umask() {
  return ok('0022\n');
}

// ---------------------------------------------------------------------
// Text processing
// ---------------------------------------------------------------------

function collectInputText(args, ctx, cmdName) {
  if (args.length === 0) return { text: ctx.stdin || '', err: null };
  return readTargets(ctx.fs, args, cmdName);
}

function cmd_grep(args, ctx) {
  const { flags, rest } = parseFlags(args, ['i', 'v', 'n', 'c', 'r', 'l', 'w', 'E']);
  if (!rest.length) return fail('grep: missing pattern\n');
  const pattern = rest[0];
  const targets = rest.slice(1);
  let flagsStr = flags.i ? 'i' : '';
  let patSrc = pattern;
  if (flags.w) patSrc = `\\b${patSrc}\\b`;
  let re;
  try {
    re = new RegExp(patSrc, flagsStr);
  } catch (e) {
    return fail(`grep: invalid pattern: ${pattern}\n`);
  }

  const searchIn = (text, label, multiFile) => {
    const lines = text.split('\n');
    const trailing = text.endsWith('\n');
    const body = trailing ? lines.slice(0, -1) : lines;
    const matches = [];
    body.forEach((line, idx) => {
      const isMatch = re.test(line);
      re.lastIndex = 0;
      if (isMatch !== !!flags.v) matches.push({ line, idx: idx + 1 });
    });
    return matches;
  };

  if (!targets.length) {
    const text = ctx.stdin || '';
    const matches = searchIn(text);
    if (flags.c) return ok(matches.length + '\n');
    const out = matches.map((m) => (flags.n ? `${m.idx}:${m.line}` : m.line)).join('\n');
    return { stdout: out ? out + '\n' : '', stderr: '', code: matches.length ? 0 : 1 };
  }

  let allOut = [];
  let anyMatch = false;
  for (const t of targets) {
    let text;
    try {
      text = readFileOrErr(ctx.fs, t, 'grep');
    } catch (e) {
      return fail(e.message + '\n');
    }
    const matches = searchIn(text);
    if (matches.length) anyMatch = true;
    const prefix = targets.length > 1 ? `${t}:` : '';
    if (flags.c) {
      allOut.push(`${prefix}${matches.length}`);
    } else if (flags.l) {
      if (matches.length) allOut.push(t);
    } else {
      for (const m of matches) allOut.push(`${prefix}${flags.n ? m.idx + ':' : ''}${m.line}`);
    }
  }
  return { stdout: allOut.length ? allOut.join('\n') + '\n' : '', stderr: '', code: anyMatch ? 0 : 1 };
}

function cmd_find(args, ctx) {
  const { flags, rest } = parseFlags(args, [], ['name', 'type']);
  const startPath = rest[0] || '.';
  const startNode = ctx.fs.getNode(startPath);
  if (!startNode) return fail(`find: '${startPath}': No such file or directory\n`);
  const results = [];
  const nameGlob = flags.name;
  const typeFilter = flags.type; // f, d, l
  const nameRe = nameGlob
    ? new RegExp('^' + nameGlob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    : null;

  const norm = ctx.fs.normalize(startPath);
  const walk = (node, path) => {
    const typeChar = node.type === 'dir' ? 'd' : node.type === 'symlink' ? 'l' : 'f';
    const nameOk = !nameRe || nameRe.test(ctx.fs.basename(path));
    const typeOk = !typeFilter || typeFilter === typeChar;
    if (nameOk && typeOk) results.push(path);
    if (node.type === 'dir') {
      const names = Array.from(node.children.keys()).sort();
      for (const name of names) {
        walk(node.children.get(name), path === '/' ? '/' + name : path + '/' + name);
      }
    }
  };
  walk(startNode, norm);
  return ok(results.join('\n') + (results.length ? '\n' : ''));
}

function cmd_sed(args, ctx) {
  const { rest } = parseFlags(args, ['n']);
  if (!rest.length) return fail('sed: missing script\n');
  const script = rest[0];
  const targets = rest.slice(1);
  const m = script.match(/^s([/#|])(.*?)\1(.*?)\1([a-z]*)$/);
  const source = collectInputText(targets, ctx, 'sed');
  if (source.err) return fail(source.err + '\n');
  if (!m) return fail(`sed: unsupported script: ${script}\n`);
  const [, , pat, repl, flags2] = m;
  const global = flags2.includes('g');
  let re;
  try {
    re = new RegExp(pat, global ? 'g' : '');
  } catch (e) {
    return fail(`sed: invalid pattern\n`);
  }
  const replFixed = repl.replace(/\\(\d)/g, '$$$1');
  const out = source.text
    .split('\n')
    .map((line) => line.replace(re, replFixed))
    .join('\n');
  return ok(out);
}

function cmd_awk(args, ctx) {
  const { flags, rest } = parseFlags(args, [], ['F']);
  if (!rest.length) return fail('awk: missing program\n');
  const program = rest[0];
  const targets = rest.slice(1);
  const source = collectInputText(targets, ctx, 'awk');
  if (source.err) return fail(source.err + '\n');
  const fs = flags.F || /\s+/;
  const printMatch = program.match(/^\{?\s*print\s+(.+?)\s*\}?$/);
  if (!printMatch) return fail(`awk: unsupported program: ${program}\n`);
  const expr = printMatch[1];
  const lines = source.text.split('\n');
  const trailing = source.text.endsWith('\n');
  const body = trailing ? lines.slice(0, -1) : lines;
  const out = body
    .map((line) => {
      const fields = fs instanceof RegExp ? line.split(fs) : line.split(fs);
      const fieldArr = [line, ...fields];
      const parts = expr.split(/\s*,\s*/).map((token) => {
        token = token.trim();
        const m = token.match(/^\$(\d+)$/);
        if (m) return fieldArr[parseInt(m[1], 10)] !== undefined ? fieldArr[parseInt(m[1], 10)] : '';
        if (token === 'NF') return String(fields.length);
        return token.replace(/^["']|["']$/g, '');
      });
      return parts.join(' ');
    })
    .join('\n');
  return ok(out + (out ? '\n' : ''));
}

function cmd_sort(args, ctx) {
  const { flags, rest } = parseFlags(args, ['n', 'r', 'u']);
  const source = collectInputText(rest, ctx, 'sort');
  if (source.err) return fail(source.err + '\n');
  let lines = source.text.split('\n');
  const trailing = source.text.endsWith('\n');
  if (trailing) lines = lines.slice(0, -1);
  let sorted = [...lines].sort((a, b) => (flags.n ? parseFloat(a) - parseFloat(b) : a.localeCompare(b)));
  if (flags.r) sorted.reverse();
  if (flags.u) sorted = sorted.filter((v, i) => sorted.indexOf(v) === i);
  return ok(sorted.join('\n') + (sorted.length ? '\n' : ''));
}

function cmd_uniq(args, ctx) {
  const { flags, rest } = parseFlags(args, ['c', 'd']);
  const source = collectInputText(rest, ctx, 'uniq');
  if (source.err) return fail(source.err + '\n');
  let lines = source.text.split('\n');
  const trailing = source.text.endsWith('\n');
  if (trailing) lines = lines.slice(0, -1);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && lines[i] === lines[i - 1]) continue;
    let count = 1;
    for (let j = i + 1; j < lines.length && lines[j] === lines[i]; j++) count++;
    if (flags.d && count < 2) continue;
    out.push(flags.c ? `${String(count).padStart(7)} ${lines[i]}` : lines[i]);
  }
  return ok(out.join('\n') + (out.length ? '\n' : ''));
}

function cmd_cut(args, ctx) {
  const { flags, rest } = parseFlags(args, [], ['d', 'f']);
  const delim = flags.d || '\t';
  const fields = (flags.f || '').split(',').map((s) => parseInt(s, 10));
  const source = collectInputText(rest, ctx, 'cut');
  if (source.err) return fail(source.err + '\n');
  let lines = source.text.split('\n');
  const trailing = source.text.endsWith('\n');
  if (trailing) lines = lines.slice(0, -1);
  const out = lines.map((line) => {
    const parts = line.split(delim);
    return fields.map((f) => parts[f - 1] ?? '').join(delim);
  });
  return ok(out.join('\n') + (out.length ? '\n' : ''));
}

function cmd_tr(args, ctx) {
  const { flags, rest } = parseFlags(args, ['d']);
  if (!rest.length) return fail('tr: missing operand\n');
  const text = ctx.stdin || '';
  if (flags.d) {
    const set = new Set(expandTrSet(rest[0]));
    return ok(Array.from(text).filter((c) => !set.has(c)).join(''));
  }
  const from = expandTrSet(rest[0]);
  const to = expandTrSet(rest[1] || '');
  const map = new Map();
  from.forEach((c, i) => map.set(c, to[i] !== undefined ? to[i] : to[to.length - 1]));
  const out = Array.from(text)
    .map((c) => (map.has(c) ? map.get(c) : c))
    .join('');
  return ok(out);
}

function expandTrSet(spec) {
  if (!spec) return [];
  const m = spec.match(/^([a-zA-Z])-([a-zA-Z])$/);
  if (m) {
    const start = m[1].charCodeAt(0);
    const end = m[2].charCodeAt(0);
    const out = [];
    for (let c = start; c <= end; c++) out.push(String.fromCharCode(c));
    return out;
  }
  return Array.from(spec);
}

function cmd_xargs(args, ctx) {
  const text = (ctx.stdin || '').trim();
  if (!text) return ok('');
  const items = text.split(/\s+/);
  const cmdName = args[0] || 'echo';
  const restArgs = args.slice(1);
  const result = ctx.run(`${cmdName} ${restArgs.join(' ')} ${items.join(' ')}`.trim());
  return { stdout: result.stdout, stderr: result.stderr, code: result.code };
}

function cmd_diff(args, ctx) {
  if (args.length < 2) return fail('diff: missing operand\n');
  let a, b;
  try {
    a = readFileOrErr(ctx.fs, args[0], 'diff');
    b = readFileOrErr(ctx.fs, args[1], 'diff');
  } catch (e) {
    return fail(e.message + '\n');
  }
  if (a === b) return ok('');
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const out = [];
  const max = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < max; i++) {
    if (linesA[i] !== linesB[i]) {
      if (linesA[i] !== undefined) out.push(`< ${linesA[i]}`);
      if (linesB[i] !== undefined) out.push(`> ${linesB[i]}`);
    }
  }
  return { stdout: out.join('\n') + '\n', stderr: '', code: 1 };
}

module.exports = {
  ok,
  fail,
  parseFlags,
  cmd_pwd,
  cmd_cd,
  cmd_ls,
  cmd_tree,
  cmd_touch,
  cmd_mkdir,
  cmd_rm,
  cmd_rmdir,
  cmd_cp,
  cmd_mv,
  cmd_ln,
  cmd_cat,
  cmd_less,
  cmd_echo,
  cmd_head,
  cmd_tail,
  cmd_wc,
  cmd_file,
  cmd_stat,
  cmd_chmod,
  cmd_chown,
  cmd_umask,
  cmd_grep,
  cmd_find,
  cmd_sed,
  cmd_awk,
  cmd_sort,
  cmd_uniq,
  cmd_cut,
  cmd_tr,
  cmd_xargs,
  cmd_diff,
  readFileOrErr,
};
