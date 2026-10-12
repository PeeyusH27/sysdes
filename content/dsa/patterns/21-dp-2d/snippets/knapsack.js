// 0/1 knapsack in one row: each item at most once. dp[c] = best value with capacity c, using the items so far.
// Capacities go DOWN, so dp[c - w] is still the value from BEFORE this item: no item is counted twice.
export function knapsack01(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let c = capacity; c >= weights[i]; c--) {
      dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
}

// Unbounded knapsack: each item as many times as you like.
// Capacities go UP, so dp[c - w] may already include this item, which is exactly what allows reuse.
export function knapsackUnbounded(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let c = weights[i]; c <= capacity; c++) {
      dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
}

// 0/1 knapsack with the full table, so the chosen items can be read back.
// dp[i][c] = best value using the first i items with capacity c. Item i was taken iff dp[i][c] !== dp[i - 1][c].
export function knapsackItems(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1];
    for (let c = 0; c <= capacity; c++) {
      dp[i][c] = dp[i - 1][c];                                                // skip item i
      if (w <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + values[i - 1]); // or take it once
    }
  }
  const chosen = [];
  for (let i = n, c = capacity; i > 0; i--) {
    if (dp[i][c] !== dp[i - 1][c]) {
      chosen.push(i - 1); // 0-based index of the item
      c -= weights[i - 1];
    }
  }
  return { best: dp[n][capacity], items: chosen.reverse() };
}
