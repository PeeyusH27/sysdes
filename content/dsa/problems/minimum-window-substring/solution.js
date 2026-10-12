function minWindow(s, t) {
  const need = new Map(); // character → copies the window still needs (negative = surplus)
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);
  let missing = t.length; // characters of t, with repeats, not yet covered by the window
  let left = 0;
  let bestStart = 0;
  let bestLen = Infinity;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (need.has(ch)) {
      if (need.get(ch) > 0) missing--; // this copy was actually needed
      need.set(ch, need.get(ch) - 1);
    }
    while (missing === 0) {            // the window covers t: record it, then try to shrink
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      if (need.has(out)) {
        need.set(out, need.get(out) + 1);
        if (need.get(out) > 0) missing++; // we just dropped a copy we needed
      }
      left++;
    }
  }
  return bestLen === Infinity ? "" : s.slice(bestStart, bestStart + bestLen);
}
