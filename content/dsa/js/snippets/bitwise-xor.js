// a ^ a = 0 and a ^ 0 = a, in any order: equal values cancel out.
console.log(5 ^ 5, 5 ^ 0, 3 ^ 5 ^ 3);            // 0 5 5

// The one value that appears once when every other value appears twice.
const singleNumber = (nums) => nums.reduce((acc, x) => acc ^ x, 0);
console.log(singleNumber([4, 1, 2, 1, 2]));      // 4

// The missing number in 0..n: XOR every index and every value; the pairs cancel.
function missingNumber(nums) {
  let acc = nums.length;
  for (let i = 0; i < nums.length; i++) acc ^= i ^ nums[i];
  return acc;
}
console.log(missingNumber([3, 0, 1]));           // 2

// Hamming distance: XOR marks the differing bits, then count them.
let diff = 1 ^ 4;
let distance = 0;
for (; diff !== 0; diff &= diff - 1) distance++;
console.log((1 ^ 4).toString(2), distance);      // 101 2

// XOR swap works, but zeroes the value when both sides are the same slot.
const arr = [6, 9];
const swapXor = (i, j) => { arr[i] ^= arr[j]; arr[j] ^= arr[i]; arr[i] ^= arr[j]; };
swapXor(0, 1);
console.log(arr);                                // [9, 6]
swapXor(0, 0);
console.log(arr);                                // [0, 6]: prefer [a[i], a[j]] = [a[j], a[i]]
