function characterReplacement(s, k) {
  const count = new Array(26).fill(0); // letter counts inside s[left..right]
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    count[s.charCodeAt(right) - 65]++;
    // Keep the most common letter and replace the rest: too many replacements means shrink.
    while (right - left + 1 - Math.max(...count) > k) {
      count[s.charCodeAt(left) - 65]--;
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
