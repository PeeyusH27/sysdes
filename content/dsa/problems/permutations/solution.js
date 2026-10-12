function permute(nums) {
  const result = [];
  const path = [];
  const used = new Array(nums.length).fill(false);

  function backtrack() {
    if (path.length === nums.length) {
      result.push([...path]);   // a full ordering: record a copy
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;    // already placed earlier in this path
      used[i] = true;           // choose
      path.push(nums[i]);
      backtrack();              // explore
      path.pop();               // un-choose
      used[i] = false;
    }
  }

  backtrack();
  return result;
}
