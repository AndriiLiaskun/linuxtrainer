// Simplified kubectl simulation against ctx.state.k8s.
'use strict';

const { parseFlags, ok, fail, readFileOrErr } = require('./commands');

function podRow(p) {
  return `${p.name.padEnd(34)} ${p.ready.padEnd(6)} ${p.status.padEnd(10)} ${String(p.restarts).padEnd(9)} 2d`;
}

function nsOf(flags) {
  return flags.n || flags.namespace || 'default';
}

function parseSimpleYaml(text) {
  // Extract just enough fields for our fixture manifests: kind, metadata.name,
  // spec.replicas, container image. Not a real YAML parser.
  const get = (re) => {
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };
  return {
    kind: get(/^kind:\s*(\S+)/m),
    name: get(/name:\s*(\S+)/m),
    replicas: get(/replicas:\s*(\d+)/m),
    image: get(/image:\s*(\S+)/m),
  };
}

function cmd_kubectl(args, ctx) {
  const [sub, ...rest] = args;
  const k8s = ctx.state.k8s;
  if (!sub) return fail('kubectl: missing command\n');

  if (sub === 'get') {
    const { flags, rest: rest2 } = parseFlags(rest, ['A'], ['n', 'namespace']);
    const resource = rest2[0];
    const ns = nsOf(flags);
    const allNs = flags.A;

    if (!resource) return fail('error: you must specify the type of resource to get\n');

    if (/^(pod|pods|po)$/.test(resource)) {
      const target = rest2[1];
      const pods = k8s.pods.filter((p) => (allNs || p.namespace === ns) && (!target || p.name === target));
      if (target && !pods.length) return fail(`Error from server (NotFound): pods "${target}" not found\n`);
      const header = allNs
        ? 'NAMESPACE   NAME                               READY  STATUS      RESTARTS  AGE'
        : 'NAME                               READY  STATUS      RESTARTS  AGE';
      const lines = pods.map((p) => (allNs ? `${p.namespace.padEnd(11)} ${podRow(p)}` : podRow(p)));
      return ok([header, ...lines].join('\n') + '\n');
    }
    if (/^(deployment|deployments|deploy)$/.test(resource)) {
      const target = rest2[1];
      const deps = k8s.deployments.filter((d) => (allNs || d.namespace === ns) && (!target || d.name === target));
      if (target && !deps.length) return fail(`Error from server (NotFound): deployments.apps "${target}" not found\n`);
      const header = 'NAME                 READY   UP-TO-DATE   AVAILABLE   AGE';
      const lines = deps.map((d) => `${d.name.padEnd(20)} ${d.replicas}/${d.replicas}   ${d.replicas}            ${d.replicas}           2d`);
      return ok([header, ...lines].join('\n') + '\n');
    }
    if (/^(service|services|svc)$/.test(resource)) {
      const target = rest2[1];
      const svcs = k8s.services.filter((s) => (allNs || s.namespace === ns) && (!target || s.name === target));
      if (target && !svcs.length) return fail(`Error from server (NotFound): services "${target}" not found\n`);
      const header = 'NAME          TYPE        CLUSTER-IP     PORT(S)    AGE';
      const lines = svcs.map((s) => `${s.name.padEnd(13)} ${s.type.padEnd(11)} ${s.clusterIP.padEnd(14)} ${s.ports.padEnd(10)} 2d`);
      return ok([header, ...lines].join('\n') + '\n');
    }
    if (/^(namespace|namespaces|ns)$/.test(resource)) {
      const header = 'NAME          STATUS   AGE';
      const lines = k8s.namespaces.map((n) => `${n.padEnd(13)} Active   10d`);
      return ok([header, ...lines].join('\n') + '\n');
    }
    return fail(`error: the server doesn't have a resource type "${resource}"\n`);
  }

  if (sub === 'describe') {
    const [resource, name] = rest;
    if (/^(pod|po)$/.test(resource)) {
      const pod = k8s.pods.find((p) => p.name === name);
      if (!pod) return fail(`Error from server (NotFound): pods "${name}" not found\n`);
      return ok(`Name:         ${pod.name}\nNamespace:    ${pod.namespace}\nStatus:       ${pod.status}\nRestarts:     ${pod.restarts}\n`);
    }
    if (/^(deployment|deploy)$/.test(resource)) {
      const dep = k8s.deployments.find((d) => d.name === name);
      if (!dep) return fail(`Error from server (NotFound): deployments.apps "${name}" not found\n`);
      return ok(`Name:         ${dep.name}\nNamespace:    ${dep.namespace}\nReplicas:     ${dep.replicas}\nImage:        ${dep.image}\n`);
    }
    return fail(`error: unknown resource type "${resource}"\n`);
  }

  if (sub === 'logs') {
    const { flags, rest: rest2 } = parseFlags(rest, ['f'], ['tail']);
    const target = rest2[0];
    const pod = k8s.pods.find((p) => p.name === target);
    if (!pod) return fail(`Error from server (NotFound): pods "${target}" not found\n`);
    const lines = [`[${pod.name}] starting up...`, `[${pod.name}] server listening on :8080`, `[${pod.name}] ready to accept connections`];
    const n = flags.tail ? parseInt(flags.tail, 10) : lines.length;
    return ok(lines.slice(-n).join('\n') + '\n');
  }

  if (sub === 'exec') {
    const { rest: rest2 } = parseFlags(rest, ['i', 't'], []);
    const target = rest2[0];
    const pod = k8s.pods.find((p) => p.name === target);
    if (!pod) return fail(`Error from server (NotFound): pods "${target}" not found\n`);
    return ok('(simulated exec output)\n');
  }

  if (sub === 'delete') {
    const { flags, rest: rest2 } = parseFlags(rest, [], ['f']);
    if (flags.f) {
      let content;
      try {
        content = readFileOrErr(ctx.fs, flags.f, 'kubectl');
      } catch (e) {
        return fail(e.message + '\n');
      }
      const parsed = parseSimpleYaml(content);
      if (!parsed.kind || !parsed.name) return fail('error: could not parse manifest (missing kind/metadata.name)\n');
      if (parsed.kind === 'Deployment') {
        const idx = k8s.deployments.findIndex((d) => d.name === parsed.name);
        if (idx === -1) return fail(`Error from server (NotFound): deployments.apps "${parsed.name}" not found\n`);
        k8s.deployments.splice(idx, 1);
        k8s.pods = k8s.pods.filter((p) => p.owner !== parsed.name);
        return ok(`deployment.apps "${parsed.name}" deleted\n`);
      }
      if (parsed.kind === 'Service') {
        const idx = k8s.services.findIndex((s) => s.name === parsed.name);
        if (idx === -1) return fail(`Error from server (NotFound): services "${parsed.name}" not found\n`);
        k8s.services.splice(idx, 1);
        return ok(`service "${parsed.name}" deleted\n`);
      }
      if (parsed.kind === 'Pod') {
        const idx = k8s.pods.findIndex((p) => p.name === parsed.name);
        if (idx === -1) return fail(`Error from server (NotFound): pods "${parsed.name}" not found\n`);
        k8s.pods.splice(idx, 1);
        return ok(`pod "${parsed.name}" deleted\n`);
      }
      return fail(`error: unsupported kind "${parsed.kind}"\n`);
    }
    const [resource, name] = rest2;
    if (/^(pod|po)$/.test(resource)) {
      const idx = k8s.pods.findIndex((p) => p.name === name);
      if (idx === -1) return fail(`Error from server (NotFound): pods "${name}" not found\n`);
      k8s.pods.splice(idx, 1);
      return ok(`pod "${name}" deleted\n`);
    }
    if (/^(deployment|deploy)$/.test(resource)) {
      const idx = k8s.deployments.findIndex((d) => d.name === name);
      if (idx === -1) return fail(`Error from server (NotFound): deployments.apps "${name}" not found\n`);
      k8s.deployments.splice(idx, 1);
      k8s.pods = k8s.pods.filter((p) => p.owner !== name);
      return ok(`deployment.apps "${name}" deleted\n`);
    }
    if (/^(service|svc)$/.test(resource)) {
      const idx = k8s.services.findIndex((s) => s.name === name);
      if (idx === -1) return fail(`Error from server (NotFound): services "${name}" not found\n`);
      k8s.services.splice(idx, 1);
      return ok(`service "${name}" deleted\n`);
    }
    return fail(`error: unknown resource type "${resource}"\n`);
  }

  if (sub === 'scale') {
    const { flags, rest: rest2 } = parseFlags(rest, [], ['replicas']);
    // Accepts both "scale deployment/web-deployment" and "scale deployment web-deployment".
    const name = rest2[0] && rest2[0].includes('/') ? rest2[0].split('/')[1] : rest2[1] || rest2[0];
    const dep = k8s.deployments.find((d) => d.name === name);
    if (!dep) return fail(`Error from server (NotFound): deployments.apps "${name}" not found\n`);
    const n = parseInt(flags.replicas, 10);
    if (Number.isNaN(n)) return fail('error: --replicas is required\n');
    const diff = n - dep.replicas;
    dep.replicas = n;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        k8s.pods.push({
          name: `${dep.name}-7c9f8b6d-${(k8s.podCounter++).toString(36).padStart(5, '0')}`,
          namespace: dep.namespace,
          status: 'Running',
          ready: '1/1',
          restarts: 0,
          owner: dep.name,
        });
      }
    } else if (diff < 0) {
      let toRemove = -diff;
      k8s.pods = k8s.pods.filter((p) => {
        if (p.owner === dep.name && toRemove > 0) {
          toRemove--;
          return false;
        }
        return true;
      });
    }
    return ok(`deployment.apps/${dep.name} scaled\n`);
  }

  if (sub === 'apply') {
    const { flags } = parseFlags(rest, [], ['f']);
    if (!flags.f) return fail('error: must specify -f\n');
    let content;
    try {
      content = readFileOrErr(ctx.fs, flags.f, 'kubectl');
    } catch (e) {
      return fail(e.message + '\n');
    }
    const parsed = parseSimpleYaml(content);
    if (!parsed.kind || !parsed.name) return fail('error: could not parse manifest (missing kind/metadata.name)\n');
    if (parsed.kind === 'Deployment') {
      let dep = k8s.deployments.find((d) => d.name === parsed.name);
      const replicas = parsed.replicas ? parseInt(parsed.replicas, 10) : 1;
      if (!dep) {
        dep = { name: parsed.name, namespace: 'default', replicas: 0, image: parsed.image || 'unknown' };
        k8s.deployments.push(dep);
      }
      dep.image = parsed.image || dep.image;
      const diff = replicas - dep.replicas;
      dep.replicas = replicas;
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          k8s.pods.push({
            name: `${dep.name}-7c9f8b6d-${(k8s.podCounter++).toString(36).padStart(5, '0')}`,
            namespace: dep.namespace,
            status: 'Running',
            ready: '1/1',
            restarts: 0,
            owner: dep.name,
          });
        }
      }
      return ok(`deployment.apps/${parsed.name} created\n`);
    }
    if (parsed.kind === 'Service') {
      let svc = k8s.services.find((s) => s.name === parsed.name);
      if (!svc) {
        svc = { name: parsed.name, namespace: 'default', type: 'ClusterIP', clusterIP: '10.96.0.' + (20 + k8s.services.length), ports: '80/TCP' };
        k8s.services.push(svc);
      }
      return ok(`service/${parsed.name} created\n`);
    }
    if (parsed.kind === 'Pod') {
      let pod = k8s.pods.find((p) => p.name === parsed.name);
      if (!pod) {
        pod = { name: parsed.name, namespace: 'default', status: 'Running', ready: '1/1', restarts: 0, owner: null };
        k8s.pods.push(pod);
      }
      return ok(`pod/${parsed.name} created\n`);
    }
    return fail(`error: unsupported kind "${parsed.kind}"\n`);
  }

  if (sub === 'create') {
    if (rest[0] === 'namespace' || rest[0] === 'ns') {
      const name = rest[1];
      if (!name) return fail('error: namespace name required\n');
      if (!k8s.namespaces.includes(name)) k8s.namespaces.push(name);
      return ok(`namespace/${name} created\n`);
    }
    return fail(`error: unsupported create resource\n`);
  }

  if (sub === 'rollout') {
    if (rest[0] === 'status') {
      const name = rest[1] && rest[1].includes('/') ? rest[1].split('/')[1] : rest[2] || rest[1];
      const dep = k8s.deployments.find((d) => d.name === name);
      if (!dep) return fail(`error: deployments.apps "${name}" not found\n`);
      return ok(`deployment "${dep.name}" successfully rolled out\n`);
    }
    if (rest[0] === 'undo') {
      const name = rest[1] && rest[1].includes('/') ? rest[1].split('/')[1] : rest[2] || rest[1];
      const dep = k8s.deployments.find((d) => d.name === name);
      if (!dep) return fail(`error: deployments.apps "${name}" not found\n`);
      return ok(`deployment.apps/${dep.name} rolled back\n`);
    }
    if (rest[0] === 'history') {
      const name = rest[1] && rest[1].includes('/') ? rest[1].split('/')[1] : rest[2] || rest[1];
      const dep = k8s.deployments.find((d) => d.name === name);
      if (!dep) return fail(`error: deployments.apps "${name}" not found\n`);
      return ok(`deployment.apps/${dep.name}\nREVISION  CHANGE-CAUSE\n1         <none>\n2         <none>\n`);
    }
    return fail('error: unsupported rollout subcommand\n');
  }

  if (sub === 'label') {
    const { flags, rest: rest2 } = parseFlags(rest, ['overwrite'], []);
    const [resource, name, ...pairs] = rest2;
    const validPairs = pairs.filter((p) => /^[\w./-]+=[\w./-]*$/.test(p));
    if (!validPairs.length) return fail("error: at least one label update is required\n");
    let obj;
    if (/^(pod|po)$/.test(resource)) obj = k8s.pods.find((p) => p.name === name);
    else if (/^(deployment|deploy)$/.test(resource)) obj = k8s.deployments.find((d) => d.name === name);
    else if (/^(service|svc)$/.test(resource)) obj = k8s.services.find((s) => s.name === name);
    if (!obj) return fail(`Error from server (NotFound): ${resource} "${name}" not found\n`);
    obj.labels = obj.labels || {};
    for (const p of validPairs) {
      const [k, v] = p.split('=');
      if (obj.labels[k] && !flags.overwrite) {
        return fail(`error: '${k}' already has a value, and --overwrite is false\n`);
      }
      obj.labels[k] = v;
    }
    return ok(`${resource}/${name} labeled\n`);
  }

  if (sub === 'port-forward') {
    const [target, ports] = rest;
    if (!target || !ports) return fail('error: TYPE/NAME and list of ports are required for port-forward\n');
    const podName = target.includes('/') ? target.split('/')[1] : target;
    const pod = k8s.pods.find((p) => p.name === podName) || k8s.deployments.find((d) => d.name === podName);
    if (!pod) return fail(`Error from server (NotFound): pods "${podName}" not found\n`);
    const [localPort, remotePort] = ports.includes(':') ? ports.split(':') : [ports, ports];
    return ok(`Forwarding from 127.0.0.1:${localPort} -> ${remotePort}\n`);
  }

  if (sub === 'top') {
    const resource = rest[0];
    if (/^(pod|pods|po)$/.test(resource)) {
      const header = 'NAME                               CPU(cores)   MEMORY(bytes)';
      const lines = k8s.pods.map((p) => `${p.name.padEnd(34)} ${(10 + p.restarts * 2)}m          ${(64 + p.restarts * 8)}Mi`);
      return ok([header, ...lines].join('\n') + '\n');
    }
    if (/^(node|nodes|no)$/.test(resource)) {
      return ok('NAME              CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%\ndevops-trainer    210m         10%    1024Mi           25%\n');
    }
    return fail('error: you must specify the type of resource to top\n');
  }

  if (sub === 'config') {
    if (rest[0] === 'current-context') return ok('devops-trainer-cluster\n');
    if (rest[0] === 'get-contexts') {
      return ok('CURRENT   NAME                      CLUSTER                 AUTHINFO\n*         devops-trainer-cluster   devops-trainer-cluster   student\n');
    }
    if (rest[0] === 'use-context') {
      const name = rest[1];
      if (!name) return fail('error: you must specify a context\n');
      if (name !== 'devops-trainer-cluster') return fail(`error: no context exists with the name: "${name}"\n`);
      return ok(`Switched to context "${name}".\n`);
    }
    return fail(`error: unknown command "${rest[0]}" for "kubectl config"\n`);
  }

  return fail(`error: unknown command "${sub}" for "kubectl"\n`);
}

module.exports = { cmd_kubectl };
