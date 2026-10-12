// Template 2: variable window, LONGEST valid. Grow right; while the window breaks the rule, shrink left;
// then the window is the longest valid one ending at right. Works when shrinking a valid window keeps it valid.
// Example rule: at most k distinct characters.
export function longestAtMostKDistinct(s, k) {
  const count = new Map();   // character → copies inside s[left..right]
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    count.set(s[right], (count.get(s[right]) ?? 0) + 1);
    while (count.size > k) {                     // invalid: too many distinct characters
      const out = s[left];
      if (count.get(out) === 1) count.delete(out); // delete at zero so size stays honest
      else count.set(out, count.get(out) - 1);
      left++;
    }
    best = Math.max(best, right - left + 1);     // record AFTER shrinking
  }
  return best;
}
