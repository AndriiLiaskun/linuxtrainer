// Small assertion helpers shared by every drill's check() function.
// check(ctx) receives ctx = { shell, fs, state, result, input }
'use strict';

function cwdIs(fs, path) {
  return fs.normalize(fs.cwd) === fs.normalize(path);
}

function exists(fs, path) {
  return fs.exists(path);
}

function isDir(fs, path) {
  return fs.isDir(path);
}

function isFile(fs, path) {
  return fs.isFile(path);
}

function notExists(fs, path) {
  return !fs.exists(path);
}

function contentEquals(fs, path, expected) {
  const n = fs.getNode(path);
  return !!n && n.type === 'file' && n.content === expected;
}

function contentContains(fs, path, needle) {
  const n = fs.getNode(path);
  return !!n && n.type === 'file' && n.content.includes(needle);
}

function modeIs(fs, path, mode) {
  const n = fs.getNode(path);
  return !!n && n.mode === mode;
}

function ownerIs(fs, path, owner) {
  const n = fs.getNode(path);
  return !!n && n.owner === owner;
}

function stdoutTrim(result) {
  return (result.stdout || '').trim();
}

function stdoutLines(result) {
  return stdoutTrim(result).split('\n').filter(Boolean);
}

function stdoutIncludes(result, needle) {
  return (result.stdout || '').includes(needle);
}

function stdoutEquals(result, expected) {
  return stdoutTrim(result) === expected.trim();
}

function succeeded(result) {
  return result.code === 0;
}

function failed(result) {
  return result.code !== 0;
}

function isSymlink(fs, path) {
  const n = fs.getNode(path, { followSymlink: false });
  return !!n && n.type === 'symlink';
}

module.exports = {
  cwdIs,
  exists,
  isDir,
  isFile,
  notExists,
  contentEquals,
  contentContains,
  modeIs,
  ownerIs,
  stdoutTrim,
  stdoutLines,
  stdoutIncludes,
  stdoutEquals,
  succeeded,
  failed,
  isSymlink,
};
