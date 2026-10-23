function numDistinct(s, t) {
  // dp[j] = ways to form the first j characters of t from the part of s processed so far
  const dp = new Array(t.length + 1).fill(0);
  dp[0] = 1; // the empty t can always be formed in one way
  for (const c of s) {
    // Go right to left so dp[j - 1] still holds the value from before this character.
    for (let j = t.length; j >= 1; j--) {
      if (c === t[j - 1]) dp[j] += dp[j - 1];
    }
  }
  return dp[t.length];
}
