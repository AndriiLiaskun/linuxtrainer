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
    check: (ctx) => h.stdoutIncludes(ctx.result, 'redis-0'),
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

  const LABEL_TARGETS = [
    { pod: 'redis-0', key: 'tier', value: 'cache' },
    { pod: 'web-deployment-7c9f8b6d-a1b2c', key: 'env', value: 'prod' },
    { pod: 'web-deployment-7c9f8b6d-x9y8z', key: 'team', value: 'platform' },
  ];
  LABEL_TARGETS.forEach(({ pod, key, value }, i) => {
    drills.push({
      id: `p-k8s-label-pod-${i}`,
      difficulty: 2,
      prompt: `Додай поду ${pod} мітку ${key}=${value}.`,
      hint: `kubectl label pod ${pod} ${key}=${value}`,
      solution: `kubectl label pod ${pod} ${key}=${value}`,
      xp: 20,
      check: (ctx) => {
        const p = ctx.state.k8s.pods.find((p) => p.name === pod);
        return !!p && p.labels && p.labels[key] === value;
      },
    });
  });
  LABEL_TARGETS.forEach(({ pod, key, value }, i) => {
    const newValue = value + '-v2';
    drills.push({
      id: `p-k8s-label-overwrite-${i}`,
      difficulty: 3,
      prompt: `Дай поду ${pod} мітку ${key}=${value}, а потім зміни її на ${key}=${newValue} за допомогою --overwrite.`,
      hint: `kubectl label pod ${pod} ${key}=${value} && kubectl label pod ${pod} ${key}=${newValue} --overwrite`,
      solution: `kubectl label pod ${pod} ${key}=${value} && kubectl label pod ${pod} ${key}=${newValue} --overwrite`,
      xp: 30,
      check: (ctx) => {
        const p = ctx.state.k8s.pods.find((p) => p.name === pod);
        return !!p && p.labels && p.labels[key] === newValue;
      },
    });
  });
  drills.push({
    id: 'p-k8s-label-no-overwrite-fails',
    difficulty: 2,
    prompt: 'Дай поду redis-0 мітку tier=cache, а потім спробуй змінити її на tier=hot БЕЗ --overwrite і зверни увагу на помилку.',
    hint: 'kubectl label pod redis-0 tier=cache && kubectl label pod redis-0 tier=hot',
    solution: 'kubectl label pod redis-0 tier=cache && kubectl label pod redis-0 tier=hot',
    xp: 20,
    check: (ctx) => (ctx.result.stderr || '').includes('--overwrite is false'),
  });

  const PORT_FORWARDS = [
    { pod: 'redis-0', local: 6379, remote: 6379 },
    { pod: 'web-deployment-7c9f8b6d-a1b2c', local: 8080, remote: 80 },
    { pod: 'web-deployment-7c9f8b6d-x9y8z', local: 9090, remote: 80 },
  ];
  PORT_FORWARDS.forEach(({ pod, local, remote }, i) => {
    drills.push({
      id: `p-k8s-port-forward-${i}`,
      difficulty: 2,
      prompt: `Прокинь локальний порт ${local} до порту ${remote} поду ${pod}.`,
      hint: `kubectl port-forward ${pod} ${local}:${remote}`,
      solution: `kubectl port-forward ${pod} ${local}:${remote}`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'Forwarding'),
    });
  });

  drills.push({
    id: 'p-k8s-rollout-undo-web',
    difficulty: 2,
    prompt: 'Відкоти web-deployment до попередньої версії.',
    hint: 'kubectl rollout undo deployment/web-deployment',
    solution: 'kubectl rollout undo deployment/web-deployment',
    xp: 25,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'rolled back'),
  });
  drills.push({
    id: 'p-k8s-rollout-undo-api',
    difficulty: 3,
    prompt: 'Застосуй маніфест k8s/api-deployment.yaml, а потім одразу відкоти api-deployment до попередньої версії.',
    hint: 'kubectl apply -f k8s/api-deployment.yaml && kubectl rollout undo deployment/api-deployment',
    solution: 'kubectl apply -f k8s/api-deployment.yaml && kubectl rollout undo deployment/api-deployment',
    xp: 30,
    check: (ctx) => h.succeeded(ctx.result) && h.stdoutIncludes(ctx.result, 'rolled back'),
  });
  drills.push({
    id: 'p-k8s-rollout-history-web',
    difficulty: 2,
    prompt: 'Перевір історію ревізій web-deployment.',
    hint: 'kubectl rollout history deployment/web-deployment',
    solution: 'kubectl rollout history deployment/web-deployment',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'REVISION'),
  });
  drills.push({
    id: 'p-k8s-rollout-history-missing-fails',
    difficulty: 2,
    prompt: 'Спробуй перевірити історію ревізій неіснуючого деплойменту ghost-app і зверни увагу на помилку.',
    hint: 'kubectl rollout history deployment/ghost-app',
    solution: 'kubectl rollout history deployment/ghost-app',
    xp: 15,
    check: (ctx) => (ctx.result.stderr || '').includes('not found'),
  });

  drills.push({
    id: 'p-k8s-top-pod',
    difficulty: 1,
    prompt: 'Переглянь споживання CPU та памʼяті всіма подами.',
    hint: 'kubectl top pod',
    solution: 'kubectl top pod',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'CPU(cores)'),
  });
  drills.push({
    id: 'p-k8s-top-node',
    difficulty: 1,
    prompt: 'Переглянь споживання ресурсів нодами кластера.',
    hint: 'kubectl top node',
    solution: 'kubectl top node',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'devops-trainer'),
  });

  const EXEC_PODS = ['redis-0', 'web-deployment-7c9f8b6d-a1b2c', 'web-deployment-7c9f8b6d-x9y8z'];
  EXEC_PODS.forEach((pod, i) => {
    drills.push({
      id: `p-k8s-exec-it-${i}`,
      difficulty: 2,
      prompt: `Відкрий інтерактивний shell усередині поду ${pod}.`,
      hint: `kubectl exec -it ${pod} -- sh`,
      solution: `kubectl exec -it ${pod} -- sh`,
      xp: 20,
      check: (ctx) => h.succeeded(ctx.result) && ctx.input.includes('exec') && ctx.input.includes(pod),
    });
  });

  const LOG_PODS = ['redis-0', 'web-deployment-7c9f8b6d-a1b2c', 'web-deployment-7c9f8b6d-x9y8z'];
  LOG_PODS.forEach((pod, i) => {
    drills.push({
      id: `p-k8s-logs-${i}`,
      difficulty: 1,
      prompt: `Перевір логи пода ${pod}.`,
      hint: `kubectl logs ${pod}`,
      solution: `kubectl logs ${pod}`,
      xp: 15,
      check: (ctx) => h.stdoutIncludes(ctx.result, pod),
    });
  });
  drills.push({
    id: 'p-k8s-logs-not-found',
    difficulty: 2,
    prompt: 'Спробуй переглянути логи пода, якого не існує (nosuchpod), і зверни увагу на помилку.',
    hint: 'kubectl logs nosuchpod',
    solution: 'kubectl logs nosuchpod',
    xp: 15,
    check: (ctx) => (ctx.result.stderr || '').includes('NotFound'),
  });

  const NAMESPACE_NAMES = ['staging', 'qa', 'monitoring'];
  NAMESPACE_NAMES.forEach((ns, i) => {
    drills.push({
      id: `p-k8s-create-ns-${i}`,
      difficulty: 1,
      prompt: `Створи новий namespace з ім'ям ${ns}.`,
      hint: `kubectl create namespace ${ns}`,
      solution: `kubectl create namespace ${ns}`,
      xp: 15,
      check: (ctx) => ctx.state.k8s.namespaces.includes(ns),
    });
  });

  drills.push({
    id: 'p-k8s-config-current-context',
    difficulty: 1,
    prompt: 'Перевір, з яким кластером (контекстом) зараз з\'єднаний kubectl.',
    hint: 'kubectl config current-context',
    solution: 'kubectl config current-context',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'devops-trainer-cluster'),
  });

  drills.push({
    id: 'p-k8s-logs-tail',
    difficulty: 2,
    prompt: 'Перевір лише ОСТАННІЙ рядок логів пода redis-0 (--tail 1).',
    hint: 'kubectl logs --tail 1 redis-0',
    solution: 'kubectl logs --tail 1 redis-0',
    xp: 20,
    check: (ctx) => h.stdoutLines(ctx.result).filter(Boolean).length === 1,
  });
  drills.push({
    id: 'p-k8s-logs-follow',
    difficulty: 2,
    prompt: 'Перевір логи пода redis-0 у режимі стеження (-f).',
    hint: 'kubectl logs -f redis-0',
    solution: 'kubectl logs -f redis-0',
    xp: 20,
    check: (ctx) => h.succeeded(ctx.result) && ctx.input.includes('-f') && h.stdoutIncludes(ctx.result, 'redis-0'),
  });

  drills.push({
    id: 'p-k8s-config-get-contexts',
    difficulty: 1,
    prompt: 'Перевір список усіх доступних kubectl-контекстів.',
    hint: 'kubectl config get-contexts',
    solution: 'kubectl config get-contexts',
    xp: 15,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'devops-trainer-cluster'),
  });
  drills.push({
    id: 'p-k8s-config-use-context',
    difficulty: 2,
    prompt: 'Перемкнись на контекст devops-trainer-cluster командою kubectl config use-context.',
    hint: 'kubectl config use-context devops-trainer-cluster',
    solution: 'kubectl config use-context devops-trainer-cluster',
    xp: 20,
    check: (ctx) => h.stdoutIncludes(ctx.result, 'Switched to context'),
  });

  return drills;
}

module.exports = { build };
