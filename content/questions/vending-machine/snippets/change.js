import { COINS } from './models.js';

// Greedy: take the largest coin that fits, repeat. With unlimited coins of a canonical system like
// 100/25/10/5 this is optimal. With LIMITED tubes it never backtracks, so it can fail even when
// change exists: owe 30¢ from one 25¢ and three 10¢, it takes the 25¢ and then needs a 5¢.
export function greedyChange(amount, counts, denoms = COINS) {
  const coins = [];
  for (const d of denoms) {
    let n = Math.min(counts[d] ?? 0, Math.floor(amount / d));
    amount -= n * d;
    while (n-- > 0) coins.push(d);
  }
  return amount === 0 ? coins : null;
}

// Bounded DP: the fewest coins that pay `amount` exactly, using at most counts[d] of each coin.
// Work is denominations × amount × coins per tube: microseconds for a vending machine.
export function makeChange(amount, counts, denoms = COINS) {
  let best = [0, ...Array(amount).fill(Infinity)];          // best[a]: fewest coins for a, denominations so far
  const used = [];                                          // used[i][a]: how many denoms[i] that best way uses
  for (const d of denoms) {
    const next = Array(amount + 1).fill(Infinity);
    const pick = Array(amount + 1).fill(0);
    for (let a = 0; a <= amount; a++) {
      for (let j = 0; j <= (counts[d] ?? 0) && j * d <= a; j++) {
        if (best[a - j * d] + j < next[a]) {
          next[a] = best[a - j * d] + j;
          pick[a] = j;
        }
      }
    }
    used.push(pick);
    best = next;
  }
  if (best[amount] === Infinity) return null;               // impossible: refuse the sale and refund
  const coins = [];
  for (let i = denoms.length - 1, a = amount; i >= 0; i--) { // walk back through the choices
    const j = used[i][a];
    for (let k = 0; k < j; k++) coins.push(denoms[i]);
    a -= j * denoms[i];
  }
  return coins.sort((x, y) => y - x);
}
