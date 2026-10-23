function minCostClimbingStairs(cost) {
  // twoBack / oneBack = cheapest cost to ARRIVE at position i - 2 / i - 1 (before paying for that step)
  let twoBack = 0;
  let oneBack = 0;
  for (let i = 2; i <= cost.length; i++) {
    const here = Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
    twoBack = oneBack;
    oneBack = here;
  }
  return oneBack;
}
