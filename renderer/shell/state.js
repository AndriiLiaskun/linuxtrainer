// Simulated state for subsystems that aren't real filesystem objects:
// processes, systemd services, package manager, git repos, docker, network.
'use strict';

function freshProcessTable() {
  return [
    { pid: 1, user: 'root', cmd: 'systemd', cpu: 0.0, mem: 0.1 },
    { pid: 118, user: 'root', cmd: '/usr/sbin/sshd', cpu: 0.0, mem: 0.3 },
    { pid: 342, user: 'root', cmd: 'nginx: master process', cpu: 0.1, mem: 0.5 },
    { pid: 343, user: 'www-data', cmd: 'nginx: worker process', cpu: 0.2, mem: 0.4 },
    { pid: 512, user: 'student', cmd: '-bash', cpu: 0.0, mem: 0.2 },
    { pid: 890, user: 'student', cmd: 'python3 app.py', cpu: 12.4, mem: 3.1 },
    { pid: 1044, user: 'student', cmd: 'node server.js', cpu: 4.5, mem: 2.2 },
  ];
}

function freshServices() {
  return {
    nginx: { active: true, enabled: true, description: 'A high performance web server' },
    sshd: { active: true, enabled: true, description: 'OpenBSD Secure Shell server' },
    docker: { active: false, enabled: true, description: 'Docker Application Container Engine' },
    cron: { active: true, enabled: true, description: 'Regular background program processing daemon' },
    postgresql: { active: false, enabled: false, description: 'PostgreSQL database server' },
    'app.service': { active: false, enabled: false, description: 'Custom webapp service' },
  };
}

function freshPackages() {
  // installed packages set for apt/yum simulation
  return new Set(['coreutils', 'bash', 'openssh-client', 'curl', 'git']);
}

const AVAILABLE_PACKAGES = new Set([
  'nginx', 'docker.io', 'docker-ce', 'postgresql', 'python3', 'python3-pip',
  'nodejs', 'npm', 'htop', 'tree', 'vim', 'curl', 'wget', 'git', 'coreutils',
  'bash', 'openssh-client', 'openssh-server', 'net-tools', 'unzip', 'zip',
  'httpd', 'apache2', 'mariadb-server', 'firewalld',
]);

function freshDocker() {
  return {
    images: [
      { repo: 'nginx', tag: 'latest', id: 'a1b2c3d4e5f6', size: '142MB' },
      { repo: 'node', tag: '20-alpine', id: 'b2c3d4e5f6a1', size: '118MB' },
    ],
    containers: [],
    networks: [{ name: 'bridge', driver: 'bridge' }],
    volumes: [],
    nextId: 1,
  };
}

function freshGitRepos() {
  // path -> { branches, currentBranch, staged Set, commits [], remotes {} , tracked Set}
  return new Map();
}

function freshK8s() {
  return {
    namespaces: ['default', 'kube-system'],
    deployments: [
      { name: 'web-deployment', namespace: 'default', replicas: 2, image: 'myapp:1.0' },
    ],
    pods: [
      { name: 'web-deployment-7c9f8b6d-a1b2c', namespace: 'default', status: 'Running', ready: '1/1', restarts: 0, owner: 'web-deployment' },
      { name: 'web-deployment-7c9f8b6d-x9y8z', namespace: 'default', status: 'Running', ready: '1/1', restarts: 0, owner: 'web-deployment' },
      { name: 'redis-0', namespace: 'default', status: 'Running', ready: '1/1', restarts: 0, owner: null },
    ],
    services: [
      { name: 'web-service', namespace: 'default', type: 'ClusterIP', clusterIP: '10.96.0.15', ports: '80/TCP' },
    ],
    podCounter: 1,
  };
}

function freshNetwork() {
  return {
    hostname: 'devops-trainer',
    listeningPorts: [
      { proto: 'tcp', local: '0.0.0.0:22', process: 'sshd' },
      { proto: 'tcp', local: '0.0.0.0:80', process: 'nginx' },
    ],
    hosts: {
      'example.com': '93.184.216.34',
      'api.internal': '10.0.0.15',
      'localhost': '127.0.0.1',
      'db.internal': '10.0.0.21',
      'cache.internal': '10.0.0.33',
      'staging.example.com': '93.184.216.50',
    },
  };
}

class SessionState {
  constructor() {
    this.reset();
  }

  reset() {
    this.processes = freshProcessTable();
    this.services = freshServices();
    this.packages = freshPackages();
    this.docker = freshDocker();
    this.k8s = freshK8s();
    this.gitRepos = freshGitRepos();
    this.network = freshNetwork();
    this.cronJobs = [];
    this.lastExitCode = 0;
    this.pendingEditor = null;
    this.history = [];
    this.aliases = {};
    this.jobCounter = 0;
    this.backgroundJobs = [];
  }
}

module.exports = { SessionState, AVAILABLE_PACKAGES };
