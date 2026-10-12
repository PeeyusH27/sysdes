function findDuplicate(nums) {
  // Read the array as a linked list: index i points to index nums[i]. The walk from index 0 ends in a loop,
  // and the loop's entry has two incoming arrows, so its index is the repeated value.
  let slow = 0;
  let fast = 0;
  do {
    slow = nums[slow];
    fast = nums[nums[fast]];
  } while (slow !== fast);
  let entry = 0;
  while (entry !== slow) {
    entry = nums[entry];
    slow = nums[slow];
  }
  return entry;
}
