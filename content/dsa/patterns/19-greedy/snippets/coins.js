// Greedy change-making: take the largest coin that fits, again and again. Returns the coins used, or null.
// Optimal for "canonical" systems like [25, 10, 5, 1], but not for arbitrary coins.
export function greedyChange(coins, amount) {
  const desc = [...coins].sort((a, b) => b - a);
  const used = [];
  for (const coin of desc) {
    while (amount >= coin) {
      amount -= coin;
      used.push(coin);
    }
  }
  return amount === 0 ? used : null;
}

// The safe answer: dp[x] = fewest coins that make x, trying every coin as the last one. O(amount × coins).
export function minCoins(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let x = 1; x <= amount; x++) {
    for (const coin of coins) if (coin <= x) dp[x] = Math.min(dp[x], dp[x - coin] + 1);
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
