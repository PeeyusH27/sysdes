// Template 1: opposite ends. Works when the input is sorted (or symmetric, like a palindrome):
// the sum or comparison at the two ends tells you which end can never be part of the answer.
export function pairSum(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;   // nums[left] is too small for every remaining partner
    else right--;               // nums[right] is too big for every remaining partner
  }
  return [-1, -1];
}
