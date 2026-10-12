// Slicing a fresh array on every call copies O(n) elements per level: O(n²) in total.
let copied = 0;
function sumSlice(nums) {
  if (nums.length === 0) return 0;
  const rest = nums.slice(1);
  copied += rest.length;
  return nums[0] + sumSlice(rest);
}
// Passing an index shares one array: O(1) extra work per call.
function sumFrom(nums, i = 0) {
  if (i === nums.length) return 0;
  return nums[i] + sumFrom(nums, i + 1);
}
const nums = Array.from({ length: 2000 }, (_, i) => i + 1);
console.log(sumSlice(nums), 'elements copied:', copied); // 2001000 elements copied: 1999000
console.log(sumFrom(nums));                               // 2001000, nothing copied

// Same idea with two indices: check a palindrome from both ends inward.
function isPal(s, lo = 0, hi = s.length - 1) {
  if (lo >= hi) return true;
  return s[lo] === s[hi] && isPal(s, lo + 1, hi - 1);
}
console.log(isPal('racecar'), isPal('rocket')); // true false
