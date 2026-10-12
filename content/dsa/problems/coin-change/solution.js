function coinChange(coins, amount) {
  const fewest = new Array(amount + 1).fill(Infinity); // Infinity = can't be made (yet)
  fewest[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      // use coin as the last coin: the rest is the smaller amount a - coin
      if (coin <= a) fewest[a] = Math.min(fewest[a], fewest[a - coin] + 1);
    }
  }
  return fewest[amount] === Infinity ? -1 : fewest[amount];
}
