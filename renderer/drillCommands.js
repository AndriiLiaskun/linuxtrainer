// Derives "which commands do I need" hints from a drill's solution text —
// without revealing HOW to combine them (that stays behind Hint/Solution).
'use strict';

// Shell keywords/builtins special-cased in shell.js outside REGISTRY
// (export/alias/which/test/printf) or handled by the parser (for/if) —
// still worth surfacing as "commands you'll need."
const EXTRA_KEYWORDS = ['export', 'alias', 'which', 'test', 'printf', 'for', 'if'];

// registryKeys: iterable of known command names (Object.keys(REGISTRY)).
function extractCommands(solutionText, registryKeys) {
  if (!solutionText || typeof solutionText !== 'string') return [];
  const known = new Set([...registryKeys, ...EXTRA_KEYWORDS]);
  const tokens = solutionText.match(/[A-Za-z][\w.-]*/g) || [];
  const seen = new Set();
  const result = [];
  for (const t of tokens) {
    if (known.has(t) && !seen.has(t)) {
      seen.add(t);
      result.push(t);
    }
  }
  return result;
}

module.exports = { extractCommands, EXTRA_KEYWORDS };
