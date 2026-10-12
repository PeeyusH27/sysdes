function rob(nums) {
  let twoBack = 0; // best total using the houses up to two before the current one
  let oneBack = 0; // best total using the houses up to the previous one
  for (const cash of nums) {
    // skip this house (keep oneBack), or rob it, which means its left neighbour was skipped
    const best = Math.max(oneBack, twoBack + cash);
    twoBack = oneBack;
    oneBack = best;
  }
  return oneBack;
}
