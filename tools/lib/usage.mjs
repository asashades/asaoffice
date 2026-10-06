// What a Claude Code run "used", counted in tokens (the office's cost limits are in tokens, not dollars: a subscription has no per-run price).
// One token count = new input + output + cache that was written; reading the cache again is left out (it is cheap and would swamp the number).
export const countOf = (u) => (u && typeof u === 'object' ? (Number(u.input_tokens ?? u.inputTokens) || 0) + (Number(u.output_tokens ?? u.outputTokens) || 0) + (Number(u.cache_creation_input_tokens ?? u.cacheCreationInputTokens) || 0) : 0);

/** Tokens in a finished run's `result` message (or a `--output-format json` answer): per-model totals when present (they include helpers), else `usage`. */
export function tokensOf(result) {
  const per = result?.modelUsage && typeof result.modelUsage === 'object' ? Object.values(result.modelUsage).reduce((n, u) => n + countOf(u), 0) : 0;
  return per || countOf(result?.usage);
}

/** Tokens so far in a streaming run: each assistant message (one id can repeat for its content blocks) counted once, the latest numbers winning. */
export function liveCounter() {
  const byId = new Map();
  let anon = 0;
  return {
    add(msg) {
      const n = countOf(msg?.message?.usage);
      if (!n) return;
      byId.set(msg.message?.id ?? `anon-${anon++}`, n);
    },
    get total() { let t = 0; for (const v of byId.values()) t += v; return t; },
  };
}

/** 1 234 567 → "1,2 jt", 48 200 → "48 rb", 900 → "900". */
export function fmtTokens(n, lang = 'id') {
  const v = Math.max(0, Math.round(Number(n) || 0));
  const dec = (x) => (lang === 'id' ? String(x).replace('.', ',') : String(x));
  if (v >= 1_000_000) return `${dec(Math.round(v / 100_000) / 10)} ${lang === 'id' ? 'jt' : 'M'}`;
  if (v >= 1_000) return `${dec(v >= 100_000 ? Math.round(v / 1000) : Math.round(v / 100) / 10)} ${lang === 'id' ? 'rb' : 'k'}`;
  return String(v);
}
