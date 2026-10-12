function lengthOfLongestSubstring(s) {
  const inWindow = new Set(); // the characters of s[left..right], each exactly once
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    // s[right] would be a repeat: shrink from the left until its old copy has left.
    while (inWindow.has(s[right])) {
      inWindow.delete(s[left]);
      left++;
    }
    inWindow.add(s[right]);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
