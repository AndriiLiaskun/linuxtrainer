// Simplified archive commands operating on the virtual filesystem.
// Archives are represented as a single VFS file whose content is a JSON
// manifest of the packed files — enough fidelity for drill validation.
'use strict';

const { parseFlags, ok, fail } = require('./commands');
const { ShellError, VNode } = require('./filesystem');

function serializeNode(fs, node, name) {
  if (node.type === 'dir') {
    const children = {};
    for (const [childName, child] of node.children) {
      children[childName] = serializeNode(fs, child, childName);
    }
    return { type: 'dir', children };
  }
  return { type: 'file', content: node.content, executable: !!node.executable };
}

function deserializeNode(entry, name) {
  if (entry.type === 'dir') {
    const node = new VNode('dir', name);
    for (const [childName, child] of Object.entries(entry.children)) {
      node.children.set(childName, deserializeNode(child, childName));
    }
    return node;
  }
  return new VNode('file', name, { content: entry.content, executable: entry.executable });
}

function cmd_tar(args, ctx) {
  const { flags, rest } = parseFlags(args, ['c', 'x', 'v', 'z', 't'], ['f']);
  const archivePath = flags.f || rest[0];
  if (!archivePath) return fail('tar: no archive name given\n');

  if (flags.c) {
    const targets = rest;
    const manifest = {};
    for (const t of targets) {
      const node = ctx.fs.getNode(t);
      if (!node) return fail(`tar: ${t}: Cannot stat: No such file or directory\n`);
      manifest[ctx.fs.basename(t)] = serializeNode(ctx.fs, node, ctx.fs.basename(t));
    }
    ctx.fs.writeFile(archivePath, JSON.stringify({ __tar__: true, manifest }));
    return ok(flags.v ? targets.join('\n') + '\n' : '');
  }

  if (flags.x) {
    const node = ctx.fs.getNode(archivePath);
    if (!node) return fail(`tar: ${archivePath}: Cannot open: No such file or directory\n`);
    let data;
    try {
      data = JSON.parse(node.content);
    } catch (e) {
      return fail(`tar: ${archivePath}: not a valid archive\n`);
    }
    const names = [];
    for (const [name, entry] of Object.entries(data.manifest)) {
      const restored = deserializeNode(entry, name);
      names.push(name);
      const destDir = ctx.fs.getNode(ctx.fs.cwd);
      destDir.children.set(name, restored);
    }
    return ok(flags.v ? names.join('\n') + '\n' : '');
  }

  if (flags.t) {
    const node = ctx.fs.getNode(archivePath);
    if (!node) return fail(`tar: ${archivePath}: Cannot open: No such file or directory\n`);
    let data;
    try {
      data = JSON.parse(node.content);
    } catch (e) {
      return fail(`tar: ${archivePath}: not a valid archive\n`);
    }
    return ok(Object.keys(data.manifest).join('\n') + '\n');
  }

  return fail('tar: you must specify one of -c, -x, -t\n');
}

function cmd_gzip(args, ctx) {
  const { flags, rest } = parseFlags(args, ['d', 'k']);
  const target = rest[0];
  if (!target) return fail('gzip: missing file operand\n');
  if (flags.d) {
    if (!target.endsWith('.gz')) return fail(`gzip: ${target}: unknown suffix -- ignored\n`);
    const node = ctx.fs.getNode(target);
    if (!node) return fail(`gzip: ${target}: No such file or directory\n`);
    const outName = target.slice(0, -3);
    ctx.fs.writeFile(outName, node.content);
    if (!flags.k) ctx.fs.remove(target, { force: true });
    return ok('');
  }
  const node = ctx.fs.getNode(target);
  if (!node) return fail(`gzip: ${target}: No such file or directory\n`);
  ctx.fs.writeFile(target + '.gz', node.content);
  if (!flags.k) ctx.fs.remove(target, { force: true });
  return ok('');
}

function cmd_zip(args, ctx) {
  const { rest } = parseFlags(args, ['r']);
  if (rest.length < 2) return fail('zip: missing operand\n');
  const [archivePath, ...targets] = rest;
  const manifest = {};
  for (const t of targets) {
    const node = ctx.fs.getNode(t);
    if (!node) return fail(`zip warning: ${t} not found\n`);
    manifest[ctx.fs.basename(t)] = serializeNode(ctx.fs, node, ctx.fs.basename(t));
  }
  ctx.fs.writeFile(archivePath.endsWith('.zip') ? archivePath : archivePath + '.zip', JSON.stringify({ __zip__: true, manifest }));
  return ok(`  adding: ${targets.join(', ')}\n`);
}

function cmd_unzip(args, ctx) {
  const { rest } = parseFlags(args, []);
  const archivePath = rest[0];
  if (!archivePath) return fail('unzip: missing archive\n');
  const node = ctx.fs.getNode(archivePath);
  if (!node) return fail(`unzip: cannot find ${archivePath}\n`);
  let data;
  try {
    data = JSON.parse(node.content);
  } catch (e) {
    return fail(`unzip: ${archivePath}: not a valid archive\n`);
  }
  const names = [];
  for (const [name, entry] of Object.entries(data.manifest)) {
    const restored = deserializeNode(entry, name);
    names.push(name);
    ctx.fs.getNode(ctx.fs.cwd).children.set(name, restored);
  }
  return ok('Archive:  ' + archivePath + '\n' + names.map((n) => '  inflating: ' + n).join('\n') + '\n');
}

module.exports = { cmd_tar, cmd_gzip, cmd_zip, cmd_unzip };
