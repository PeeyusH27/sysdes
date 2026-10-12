function longestCommonSubsequence(text1, text2) {
  const m = text1.length;
  const n = text2.length;
  // dp[i][j] = LCS length of the first i letters of text1 and the first j letters of text2.
  // Row 0 and column 0 are the empty prefixes and stay 0.
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1; // use both last letters
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);              // drop one of them
    }
  }
  return dp[m][n];
}
