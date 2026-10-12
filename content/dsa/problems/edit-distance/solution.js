function minDistance(word1, word2) {
  const m = word1.length;
  const n = word2.length;
  // dp[i][j] = fewest edits to turn the first i letters of word1 into the first j letters of word2
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i; // delete all i letters
  for (let j = 0; j <= n; j++) dp[0][j] = j; // insert all j letters
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // last letters already match: no edit needed
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j - 1], // replace word1's last letter with word2's
          dp[i - 1][j],     // delete word1's last letter
          dp[i][j - 1],     // insert word2's last letter
        );
      }
    }
  }
  return dp[m][n];
}
