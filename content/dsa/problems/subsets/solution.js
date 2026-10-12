function subsets(nums) {
  const result = [];
  const path = [];

  function backtrack(start) {
    result.push([...path]);     // every node of the recursion tree is a subset: record a copy
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);       // choose
      backtrack(i + 1);         // explore: only later numbers, so no subset is built twice
      path.pop();               // un-choose
    }
  }

  backtrack(0);
  return result;
}
