function rotate(nums, k) {
  const n = nums.length;
  k %= n; // a full lap changes nothing
  const reverse = (left, right) => {
    while (left < right) {
      [nums[left], nums[right]] = [nums[right], nums[left]];
      left++;
      right--;
    }
  };
  reverse(0, n - 1); // [7,6,5,4,3,2,1]
  reverse(0, k - 1); // the last k values are now in front, in the right order
  reverse(k, n - 1); // and so are the rest
}
