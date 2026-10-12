function climbStairs(n) {
  let prev2 = 1; // ways to stand on step i - 2 (step 0: the empty climb)
  let prev1 = 1; // ways to stand on step i - 1 (step 1: a single one-step)
  for (let i = 2; i <= n; i++) {
    const current = prev1 + prev2; // the last move was a one-step or a two-step
    prev2 = prev1;
    prev1 = current;
  }
  return prev1;
}
