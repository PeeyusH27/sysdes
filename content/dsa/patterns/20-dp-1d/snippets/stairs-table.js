// Form 3: bottom-up table. dp[i] = cheapest total cost to stand on step i.
// Fill from the base cases upward, so the two cells a step reads are always ready. No recursion, no stack limit.
export function minCostTable(cost) {
  const n = cost.length;
  const dp = new Array(n + 1).fill(0); // dp[0] = dp[1] = 0: start on either step for free
  for (let i = 2; i <= n; i++) {
    dp[i] = Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);
  }
  return dp[n]; // the answer cell: the top, one past the last step
}
