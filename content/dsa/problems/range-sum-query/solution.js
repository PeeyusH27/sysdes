class NumArray {
  constructor(nums) {
    // prefix[i] = sum of the first i values: prefix[0] = 0, and prefix has nums.length + 1 entries.
    this.prefix = new Array(nums.length + 1).fill(0);
    for (let i = 0; i < nums.length; i++) this.prefix[i + 1] = this.prefix[i] + nums[i];
  }

  sumRange(left, right) {
    // (everything up to right) - (everything before left)
    return this.prefix[right + 1] - this.prefix[left];
  }
}
