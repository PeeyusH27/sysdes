function countSubstrings(s) {
  let count = 0;

  // Every successful expansion from a center is one more palindrome.
  const expand = (left, right) => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      count++;
      left--;
      right++;
    }
  };

  for (let i = 0; i < s.length; i++) {
    expand(i, i); // odd lengths
    expand(i, i + 1); // even lengths
  }
  return count;
}
