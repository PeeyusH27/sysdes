// DP over an amount: dp[a] = the fewest perfect squares that add up to a.
// Each cell tries every possible LAST piece (a square k² that fits) and reads the cell for what is left.
// Swap the squares for a coin list and this is Coin Change; keep Infinity for amounts that can't be made.
export function numSquares(n) {
  const dp = new Array(n + 1).fill(Infinity); // Infinity = "not reachable (yet)"
  dp[0] = 0;                                   // the amount 0 needs no pieces
  for (let a = 1; a <= n; a++) {
    for (let k = 1; k * k <= a; k++) {
      dp[a] = Math.min(dp[a], dp[a - k * k] + 1);
    }
  }
  return dp[n];
}
