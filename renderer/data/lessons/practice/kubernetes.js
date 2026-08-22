'use strict';
const h = require('../helpers');

const SCALE_TARGETS = [1, 3, 5, 6, 8, 10];

function build() {
  const drills = [];

  SCALE_TARGETS.forEach((n, i) => {
    drills.push({
      id: `p-k8s-scale-${i}`,
      difficulty: n > 5 ? 2 : 1,
      prompt: `Масштабуй web-deployment до ${n} реплік.`,
      hint: `kubectl scale deployment web-deployment --replicas=${n}`,
      solution: `kubectl scale deployment web-deployment --replicas=${n}`,
      xp: 20,
      check: (ctx) => {
        const dep = ctx.state.k8s.deployments.find((d) => d.name === 'web-deployment');
        return !!dep && dep.replicas === n;
      },
    });
  });

  drills.push({
    id: 'p-k8s-get-pods',
    difficulty: 1,
    prompt: 'Переглянь усі поди в кластері.',
    hint: 'kubectl get pods',
    solution: 'kubectl get pods',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'READY'),
  });
  drills.push({
    id: 'p-k8s-get-svc',
    difficulty: 1,
    prompt: 'Переглянь усі сервіси в кластері.',
    hint: 'kubectl get services',
    solution: 'kubectl get services',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'web-service'),
  });
  drills.push({
    id: 'p-k8s-describe-web',
    difficulty: 2,
    prompt: 'Отримай детальну інформацію про web-deployment.',
    hint: 'kubectl describe deployment web-deployment',
    solution: 'kubectl describe deployment web-deployment',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Replicas:'),
  });
  drills.push({
    id: 'p-k8s-delete-redis',
    difficulty: 2,
    prompt: 'Видали под redis-0.',
    hint: 'kubectl delete pod redis-0',
    solution: 'kubectl delete pod redis-0',
    xp: 20,
    check: (ctx) => !ctx.state.k8s.pods.some((p) => p.name === 'redis-0'),
  });
  drills.push({
    id: 'p-k8s-logs-redis',
    difficulty: 1,
    prompt: 'Перевір логи поду redis-0.',
    hint: 'kubectl logs redis-0',
    solution: 'kubectl logs redis-0',
    xp: 15,
    check: (ctx) => h.succeeded(ctx.result),
  });
  drills.push({
    id: 'p-k8s-apply-deployment',
    difficulty: 3,
    prompt: 'Застосуй маніфест k8s/api-deployment.yaml.',
    hint: 'kubectl apply -f k8s/api-deployment.yaml',
    solution: 'kubectl apply -f k8s/api-deployment.yaml',
    xp: 30,
    check: (ctx) => ctx.state.k8s.deployments.some((d) => d.name === 'api-deployment'),
  });
  drills.push({
    id: 'p-k8s-apply-service',
    difficulty: 3,
    prompt: 'Застосуй маніфест k8s/api-service.yaml.',
    hint: 'kubectl apply -f k8s/api-service.yaml',
    solution: 'kubectl apply -f k8s/api-service.yaml',
    xp: 25,
    check: (ctx) => ctx.state.k8s.services.some((s) => s.name === 'api-service'),
  });
  drills.push({
    id: 'p-k8s-rollout',
    difficulty: 2,
    prompt: 'Перевір статус викотки web-deployment.',
    hint: 'kubectl rollout status deployment/web-deployment',
    solution: 'kubectl rollout status deployment/web-deployment',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'successfully rolled out'),
  });

  const NS = ['staging', 'qa', 'preview', 'sandbox'];
  NS.forEach((n, i) => {
    drills.push({
      id: `p-k8s-ns-${i}`,
      difficulty: 1,
      prompt: `Створи неймспейс з назвою ${n}.`,
      hint: `kubectl create namespace ${n}`,
      solution: `kubectl create namespace ${n}`,
      xp: 15,
      check: (ctx) => ctx.state.k8s.namespaces.includes(n),
    });
  });

  drills.push({
    id: 'p-k8s-context',
    difficulty: 1,
    prompt: "Дізнайся, з яким кластером зараз працює kubectl.",
    hint: 'kubectl config current-context',
    solution: 'kubectl config current-context',
    xp: 10,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'devops-trainer-cluster'),
  });

  return drills;
}

module.exports = { build };
