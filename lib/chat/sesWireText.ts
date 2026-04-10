/**
 * Collapses JSON-style escapes for **comparison only** (e.g. matching an optimistic
 * row to a SES echo when the wire shape differs). Do **not** use for display — keep
 * `Message.text` identical to what the user typed and what the backend stores.
 */
export function normalizeSesWireMessageText(text: string): string {
  let s = text;
  for (let i = 0; i < 12; i++) {
    const next = s.replace(/\\"/g, '"');
    if (next === s) break;
    s = next;
  }
  for (let i = 0; i < 12; i++) {
    const next = s.replace(/\\\\/g, "\\");
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * After `reduceLoadConversationBackslashesBeforeQuotes`, turn a message that is **only**
 * backslash+quote pairs (e.g. API `\"\"`) into plain ASCII quotes `""` so the bubble
 * shows two `"` characters (same as sending `""`).
 */
export function unwrapLoadConversationQuoteOnlyPairs(text: string): string {
  const t = text.trim();
  if (!t) return text;
  if (!/^(\s*\\"\s*)+$/.test(t)) return text;
  return t.replace(/\\"/g, '"').trim();
}

/**
 * Each run of `\` immediately before `"`:
 * - **Exactly 3** at start of run → remove those backslashes (keep the `"`).
 * - While `n > 3`, subtract the largest `k` in `{3,6,9,12,…}` with `n > k`.
 * - If we end with `n === 3` and **original** run length was **≤ 6**, clear that run
 *   (plain `"`). Longer runs that stop at 3 keep those three `\`.
 */
export function reduceLoadConversationBackslashesBeforeQuotes(text: string): string {
  return text.replace(/\\+(?=")/g, (run) => {
    const orig = run.length;
    let n = orig;
    if (n === 3) return "";

    while (n > 3) {
      let k = 3;
      while (n > k + 3) {
        k += 3;
      }
      if (n > k) n -= k;
      else break;
    }
    if (n === 3 && orig <= 6) n = 0;
    return "\\".repeat(n);
  });
}

/** API load: reduce backslashes before `"`, then unwrap quote-only bodies to `""`. */
export function normalizeLoadConversationApiMessageText(text: string): string {
  return unwrapLoadConversationQuoteOnlyPairs(
    reduceLoadConversationBackslashesBeforeQuotes(text),
  );
}
