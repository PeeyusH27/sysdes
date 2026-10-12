// Two-string DP: dp[i][j] = length of the longest common subsequence of a.slice(0, i) and b.slice(0, j).
// Row 0 and column 0 stand for the empty prefix (LCS 0), so the loops start at 1 and read a[i - 1], b[j - 1].
// After filling, walk back from dp[m][n] to rebuild one longest common subsequence.
export function lcsString(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1; // both last letters are used
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);       // drop one of them
    }
  }
  const out = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out.push(a[i - 1]); // this cell came from the diagonal: the letter is in the answer
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--; // the value came from above
    else j--;                                      // the value came from the left
  }
  return out.reverse().join("");
}
