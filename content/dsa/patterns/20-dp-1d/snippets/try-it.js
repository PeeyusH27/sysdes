import { minCostRecursive } from './stairs-recursive.js'; // @hide
import { minCostMemo } from './stairs-memo.js'; // @hide
import { minCostTable } from './stairs-table.js'; // @hide
import { minCostRolling } from './stairs-rolling.js'; // @hide
import { numSquares } from './over-amount.js'; // @hide
// The same problem four ways. Edit cost and press Run: all four must agree.
const cost = [1, 4, 2, 3, 1, 5, 2];
console.log(minCostRecursive(cost), minCostMemo(cost), minCostTable(cost), minCostRolling(cost)); // 6 6 6 6

// Why the memo matters: count the calls each version makes on a 25-step staircase.
const long = Array.from({ length: 25 }, (_, i) => (i * 7) % 10);
let plainCalls = 0;
const plain = (i) => {
  plainCalls++;
  return i <= 1 ? 0 : Math.min(plain(i - 1) + long[i - 1], plain(i - 2) + long[i - 2]);
};
let memoCalls = 0;
const memo = new Map();
const cached = (i) => {
  memoCalls++;
  if (i <= 1) return 0;
  if (!memo.has(i)) memo.set(i, Math.min(cached(i - 1) + long[i - 1], cached(i - 2) + long[i - 2]));
  return memo.get(i);
};
console.log(plain(25), `${plainCalls} calls`);  // 41 242785 calls
console.log(cached(25), `${memoCalls} calls`);  // 41 49 calls

// DP over an amount: the fewest perfect squares that add up to n.
console.log(numSquares(12), numSquares(13));    // 3 2
