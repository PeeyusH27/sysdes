// Form 4: rolling variables. dp[i] only reads dp[i - 1] and dp[i - 2], so keep just those two: O(1) space.
export function minCostRolling(cost) {
  let twoBack = 0; // dp[i - 2]
  let oneBack = 0; // dp[i - 1]
  for (let i = 2; i <= cost.length; i++) {
    const current = Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
    twoBack = oneBack; // slide the window one step to the right
    oneBack = current;
  }
  return oneBack;
}
