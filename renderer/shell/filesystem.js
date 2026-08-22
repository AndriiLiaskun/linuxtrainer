// Virtual Unix-like filesystem used by the drill shell.
// Pure, dependency-free JS so it can run both inside Electron's renderer
// and inside a plain browser tab for testing.

'use strict';

const USERS = {
  student: { uid: 1000, gid: 1000, group: 'student' },
  root: { uid: 0, gid: 0, group: 'root' },
};

function nowStamp() {
  return 'Aug 22 12:00';
}

class VNode {
  constructor(type, name, opts = {}) {
    this.type = type; // 'dir' | 'file' | 'symlink'
    this.name = name;
    this.owner = opts.owner || 'student';
    this.group = opts.group || 'student';
    this.mode = opts.mode !== undefined ? opts.mode : (type === 'dir' ? 0o755 : 0o644);
    this.mtime = opts.mtime || nowStamp();
    if (type === 'dir') {
      this.children = new Map(); // name -> VNode
    } else if (type === 'file') {
      this.content = opts.content !== undefined ? opts.content : '';
      this.executable = !!opts.executable;
      if (this.executable) this.mode |= 0o111;
    } else if (type === 'symlink') {
      this.target = opts.target || '';
    }
  }
}

class FileSystem {
  constructor() {
    this.root = new VNode('dir', '/', { mode: 0o755 });
    this.cwd = '/';
    this.currentUser = 'student';
    this.env = {
      HOME: '/home/student',
      USER: 'student',
      SHELL: '/bin/bash',
      PATH: '/usr/local/bin:/usr/bin:/bin',
      PWD: '/',
    };
    this._buildDefaultTree();
    this.cwd = '/home/student';
    this.env.PWD = this.cwd;
  }

  // ---------- path helpers ----------

  normalize(path) {
    if (!path) return this.cwd;
    let base = path.startsWith('/') ? '/' : this.cwd;
    if (path.startsWith('~')) {
      path = this.env.HOME + path.slice(1);
      base = '/';
    }
    const parts = path.split('/').filter((p) => p !== '' && p !== '.');
    const baseParts = base === '/' ? [] : base.split('/').filter(Boolean);
    const stack = base.startsWith('/') && path.startsWith('/') ? [] : [...baseParts];
    for (const part of parts) {
      if (part === '..') {
        if (stack.length) stack.pop();
      } else {
        stack.push(part);
      }
    }
    return '/' + stack.join('/');
  }

  resolve(path) {
    return this.normalize(path);
  }

  dirname(path) {
    const norm = this.normalize(path);
    if (norm === '/') return '/';
    const idx = norm.lastIndexOf('/');
    return idx === 0 ? '/' : norm.slice(0, idx);
  }

  basename(path) {
    const norm = this.normalize(path);
    if (norm === '/') return '/';
    return norm.slice(norm.lastIndexOf('/') + 1);
  }

  // ---------- node lookup ----------

  _splitPath(path) {
    const norm = this.normalize(path);
    if (norm === '/') return [];
    return norm.split('/').filter(Boolean);
  }

  getNode(path, { followSymlink = true, depth = 0 } = {}) {
    if (depth > 20) throw new ShellError('too many levels of symbolic links');
    const parts = this._splitPath(path);
    let node = this.root;
    for (let i = 0; i < parts.length; i++) {
      if (node.type !== 'dir') return null;
      const child = node.children.get(parts[i]);
      if (!child) return null;
      if (child.type === 'symlink' && (followSymlink || i < parts.length - 1)) {
        const targetPath = child.target.startsWith('/')
          ? child.target
          : this.normalize(this._joinFromNode(parts.slice(0, i)) + '/' + child.target);
        const resolved = this.getNode(targetPath, { followSymlink: true, depth: depth + 1 });
        if (!resolved) return null;
        node = resolved;
        continue;
      }
      node = child;
    }
    return node;
  }

  _joinFromNode(parts) {
    return '/' + parts.join('/');
  }

  getParent(path) {
    return this.getNode(this.dirname(path));
  }

  exists(path) {
    return this.getNode(path) !== null;
  }

  isDir(path) {
    const n = this.getNode(path);
    return !!n && n.type === 'dir';
  }

  isFile(path) {
    const n = this.getNode(path);
    return !!n && n.type === 'file';
  }

  // ---------- mutation ----------

  mkdir(path, { parents = false, mode = 0o755 } = {}) {
    const norm = this.normalize(path);
    if (norm === '/') throw new ShellError('cannot create directory ‘/’: File exists');
    const parts = this._splitPath(norm);
    let node = this.root;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      let child = node.children.get(parts[i]);
      if (!child) {
        if (!isLast && !parents) {
          throw new ShellError(`cannot create directory '${norm}': No such file or directory`);
        }
        if (isLast || parents) {
          child = new VNode('dir', parts[i], { mode, owner: this.currentUser, group: USERS[this.currentUser].group });
          node.children.set(parts[i], child);
        }
      } else if (isLast && !parents) {
        throw new ShellError(`cannot create directory '${norm}': File exists`);
      } else if (child.type !== 'dir') {
        throw new ShellError(`cannot create directory '${norm}': Not a directory`);
      }
      node = child;
    }
    return node;
  }

  touch(path) {
    const norm = this.normalize(path);
    const existing = this.getNode(norm);
    if (existing) {
      existing.mtime = nowStamp();
      return existing;
    }
    const parent = this.getParent(norm);
    if (!parent || parent.type !== 'dir') {
      throw new ShellError(`cannot touch '${path}': No such file or directory`);
    }
    const node = new VNode('file', this.basename(norm), {
      owner: this.currentUser,
      group: USERS[this.currentUser].group,
    });
    parent.children.set(this.basename(norm), node);
    return node;
  }

  writeFile(path, content, { append = false } = {}) {
    const norm = this.normalize(path);
    let node = this.getNode(norm);
    if (node && node.type === 'dir') {
      throw new ShellError(`${path}: Is a directory`);
    }
    if (!node) {
      const parent = this.getParent(norm);
      if (!parent || parent.type !== 'dir') {
        throw new ShellError(`${path}: No such file or directory`);
      }
      node = new VNode('file', this.basename(norm), { owner: this.currentUser, group: USERS[this.currentUser].group });
      parent.children.set(this.basename(norm), node);
    }
    node.content = append ? node.content + content : content;
    node.mtime = nowStamp();
    return node;
  }

  remove(path, { recursive = false, force = false } = {}) {
    const norm = this.normalize(path);
    if (norm === '/') throw new ShellError('refusing to remove ‘/’');
    const node = this.getNode(norm);
    if (!node) {
      if (force) return;
      throw new ShellError(`cannot remove '${path}': No such file or directory`);
    }
    if (node.type === 'dir' && node.children.size > 0 && !recursive) {
      throw new ShellError(`cannot remove '${path}': Is a directory`);
    }
    if (node.type === 'dir' && !recursive && node.children.size === 0) {
      // rm without -r on empty dir still fails on real Linux; require rmdir/-r
      throw new ShellError(`cannot remove '${path}': Is a directory`);
    }
    const parent = this.getParent(norm);
    parent.children.delete(this.basename(norm));
  }

  rmdir(path) {
    const norm = this.normalize(path);
    const node = this.getNode(norm);
    if (!node) throw new ShellError(`failed to remove '${path}': No such file or directory`);
    if (node.type !== 'dir') throw new ShellError(`failed to remove '${path}': Not a directory`);
    if (node.children.size > 0) throw new ShellError(`failed to remove '${path}': Directory not empty`);
    const parent = this.getParent(norm);
    parent.children.delete(this.basename(norm));
  }

  copy(src, dest, { recursive = false } = {}) {
    const srcNode = this.getNode(src);
    if (!srcNode) throw new ShellError(`cannot stat '${src}': No such file or directory`);
    if (srcNode.type === 'dir' && !recursive) {
      throw new ShellError(`-r not specified; omitting directory '${src}'`);
    }
    const destNorm = this.normalize(dest);
    let destNode = this.getNode(destNorm);
    let finalPath = destNorm;
    if (destNode && destNode.type === 'dir') {
      finalPath = this.normalize(destNorm + '/' + this.basename(src));
    }
    const clone = this._cloneNode(srcNode, this.basename(finalPath));
    const parent = this.getParent(finalPath);
    if (!parent || parent.type !== 'dir') {
      throw new ShellError(`cannot create '${dest}': No such file or directory`);
    }
    parent.children.set(this.basename(finalPath), clone);
    return clone;
  }

  _cloneNode(node, newName) {
    const clone = new VNode(node.type, newName, {
      owner: node.owner,
      group: node.group,
      mode: node.mode,
      content: node.content,
      executable: node.executable,
      target: node.target,
    });
    if (node.type === 'dir') {
      for (const [name, child] of node.children) {
        clone.children.set(name, this._cloneNode(child, name));
      }
    }
    return clone;
  }

  move(src, dest) {
    const srcNorm = this.normalize(src);
    const srcNode = this.getNode(srcNorm);
    if (!srcNode) throw new ShellError(`cannot stat '${src}': No such file or directory`);
    let destNorm = this.normalize(dest);
    const destNode = this.getNode(destNorm);
    if (destNode && destNode.type === 'dir') {
      destNorm = this.normalize(destNorm + '/' + this.basename(srcNorm));
    }
    const destParent = this.getParent(destNorm);
    if (!destParent || destParent.type !== 'dir') {
      throw new ShellError(`cannot move '${src}' to '${dest}': No such file or directory`);
    }
    const srcParent = this.getParent(srcNorm);
    srcParent.children.delete(this.basename(srcNorm));
    srcNode.name = this.basename(destNorm);
    destParent.children.set(this.basename(destNorm), srcNode);
    return srcNode;
  }

  chmod(path, mode) {
    const node = this.getNode(path);
    if (!node) throw new ShellError(`cannot access '${path}': No such file or directory`);
    node.mode = mode;
  }

  chown(path, owner, group) {
    const node = this.getNode(path);
    if (!node) throw new ShellError(`cannot access '${path}': No such file or directory`);
    node.owner = owner;
    if (group) node.group = group;
  }

  symlink(target, linkPath) {
    const parent = this.getParent(linkPath);
    if (!parent || parent.type !== 'dir') {
      throw new ShellError(`cannot create symbolic link '${linkPath}': No such file or directory`);
    }
    const node = new VNode('symlink', this.basename(linkPath), { target });
    parent.children.set(this.basename(linkPath), node);
    return node;
  }

  chdir(path) {
    const norm = this.normalize(path);
    const node = this.getNode(norm);
    if (!node) throw new ShellError(`cd: ${path}: No such file or directory`);
    if (node.type !== 'dir') throw new ShellError(`cd: ${path}: Not a directory`);
    this.cwd = norm;
    this.env.PWD = norm;
  }

  list(path) {
    const node = this.getNode(path || this.cwd);
    if (!node) throw new ShellError(`cannot access '${path}': No such file or directory`);
    if (node.type !== 'dir') return [node];
    return Array.from(node.children.values());
  }

  // ---------- permission formatting ----------

  static modeString(node) {
    const typeChar = node.type === 'dir' ? 'd' : node.type === 'symlink' ? 'l' : '-';
    const m = node.mode;
    const perms = (bits) => {
      const r = bits & 4 ? 'r' : '-';
      const w = bits & 2 ? 'w' : '-';
      const x = bits & 1 ? 'x' : '-';
      return r + w + x;
    };
    return typeChar + perms((m >> 6) & 7) + perms((m >> 3) & 7) + perms(m & 7);
  }

  // ---------- seed content ----------

  _buildDefaultTree() {
    this.mkdir('/home/student', { parents: true });
    this.mkdir('/home/student/projects', { parents: true });
    this.mkdir('/home/student/projects/webapp/src', { parents: true });
    this.mkdir('/home/student/projects/webapp/logs', { parents: true });
    this.mkdir('/home/student/documents', { parents: true });
    this.mkdir('/home/student/.config', { parents: true });
    this.mkdir('/var/log', { parents: true });
    this.mkdir('/var/www/html', { parents: true });
    this.mkdir('/etc', { parents: true });
    this.mkdir('/tmp', { parents: true, mode: 0o1777 });
    this.mkdir('/usr/bin', { parents: true });
    this.mkdir('/opt', { parents: true });
    this.mkdir('/home/student/k8s', { parents: true });

    this.writeFile('/home/student/documents/notes.txt', 'TODO: learn grep and sed\nBuy coffee\nDeploy app on Friday\n');
    this.writeFile('/home/student/documents/report.csv', 'name,score\nalice,91\nbob,74\ncarol,88\n');
    this.writeFile(
      '/home/student/documents/inventory.csv',
      'id,item,qty,price\n' +
        '1,keyboard,12,25\n' +
        '2,monitor,4,180\n' +
        '3,mouse,30,15\n' +
        '4,webcam,8,40\n' +
        '5,headset,17,35\n'
    );
    this.writeFile(
      '/home/student/documents/servers.txt',
      'web-01\nweb-02\ndb-01\ncache-01\nlb-01\n'
    );
    this.writeFile('/home/student/projects/webapp/src/app.py', 'print("hello devops")\n');
    this.writeFile('/home/student/projects/webapp/README.md', '# webapp\nSample project for drills.\n');
    this.writeFile(
      '/home/student/projects/webapp/logs/app.log',
      '2026-08-20 10:00:01 INFO Starting service\n' +
        '2026-08-20 10:00:05 INFO Listening on port 8080\n' +
        '2026-08-20 10:03:12 WARN High memory usage\n' +
        '2026-08-20 10:05:44 ERROR Failed to connect to database\n' +
        '2026-08-20 10:05:45 ERROR Retry attempt 1 failed\n' +
        '2026-08-20 10:06:01 INFO Recovered connection\n'
    );
    this.writeFile('/etc/hostname', 'devops-trainer\n');
    this.writeFile('/etc/motd', 'Welcome to the LinuxTrainer sandbox.\n');
    this.writeFile('/var/log/syslog', 'Aug 20 09:59:59 kernel: booting\nAug 20 10:00:00 systemd: started network\n');

    const deploy = this.writeFile(
      '/home/student/projects/webapp/deploy.sh',
      '#!/bin/bash\necho "Deploying webapp..."\n'
    );
    deploy.executable = true;
    deploy.mode = 0o755;

    this.writeFile(
      '/home/student/k8s/api-deployment.yaml',
      'apiVersion: apps/v1\n' +
        'kind: Deployment\n' +
        'metadata:\n' +
        '  name: api-deployment\n' +
        'spec:\n' +
        '  replicas: 3\n' +
        '  template:\n' +
        '    spec:\n' +
        '      containers:\n' +
        '        - name: api\n' +
        '          image: myapp/api:2.0\n'
    );
    this.writeFile(
      '/home/student/k8s/api-service.yaml',
      'apiVersion: v1\n' +
        'kind: Service\n' +
        'metadata:\n' +
        '  name: api-service\n' +
        'spec:\n' +
        '  type: ClusterIP\n' +
        '  ports:\n' +
        '    - port: 80\n'
    );

    this.chmod('/home/student/documents/notes.txt', 0o644);
  }
}

class ShellError extends Error {}

module.exports = { FileSystem, VNode, ShellError, USERS };
