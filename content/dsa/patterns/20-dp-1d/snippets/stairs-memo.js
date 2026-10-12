// Form 2: top-down with a memo. The same recursion, but each best(i) is computed once and cached,
// so there are only n + 1 real computations: O(n) time, O(n) memo + O(n) call stack.
export function minCostMemo(cost) {
  const memo = new Map();
  const best = (i) => {
    if (i <= 1) return 0;
    if (memo.has(i)) return memo.get(i); // has(), not get(): a cached 0 is still a hit
    const value = Math.min(best(i - 1) + cost[i - 1], best(i - 2) + cost[i - 2]);
    memo.set(i, value);
    return value;
  };
  return best(cost.length);
}
