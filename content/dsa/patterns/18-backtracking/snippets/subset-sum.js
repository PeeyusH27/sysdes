// Template 3: pruning. Lists every group of numbers (each used at most once) that adds up to target.
// The numbers are positive and distinct. Sorting first means that once a number is too big for what
// is left, every number after it is too: break, and the whole rest of the loop is skipped.
export function subsetsWithSum(nums, target) {
  const sorted = [...nums].sort((a, b) => a - b);
  const result = [];
  const path = [];

  function backtrack(start, remaining) {
    if (remaining === 0) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remaining) break;          // prune this branch and all the ones after it
      path.push(sorted[i]);                      // choose
      backtrack(i + 1, remaining - sorted[i]);   // explore: i + 1, each number at most once
      path.pop();                                // un-choose
    }
  }

  backtrack(0, target);
  return result;
}
