function longestPalindrome(s) {
  let start = 0;
  let bestLen = 1;

  // Expand around the center (left, right) while both ends match; returns the palindrome length.
  const expand = (left, right) => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      left--;
      right++;
    }
    return right - left - 1;
  };

  for (let i = 0; i < s.length; i++) {
    const odd = expand(i, i); // center on a character
    const even = expand(i, i + 1); // center between two characters
    const len = Math.max(odd, even);
    if (len > bestLen) {
      bestLen = len;
      start = i - ((len - 1) >> 1);
    }
  }
  return s.slice(start, start + bestLen);
}
