// 1. Removing while looping forward skips the element that slides into place.
const nums = [2, 4, 4, 5];
for (let i = 0; i < nums.length; i++) if (nums[i] % 2 === 0) nums.splice(i, 1);
console.log(nums);                       // [4, 5]: one 4 survived

const fixed = [2, 4, 4, 5];
for (let i = fixed.length - 1; i >= 0; i--) if (fixed[i] % 2 === 0) fixed.splice(i, 1);
console.log(fixed, [2, 4, 4, 5].filter((n) => n % 2 !== 0)); // [5] [5]: loop backwards, or filter

// 2. sort, reverse and splice change the caller's array. Copy first if you need the original.
function median(values) {
  const sorted = [...values].sort((a, b) => a - b); // or values.toSorted(...)
  return sorted[sorted.length >> 1];
}
const input = [9, 1, 5];
console.log(median(input), input);       // 5 [9, 1, 5]: input untouched

// 3. Off-by-one: the last index is length - 1, and pairs stop one early.
const a = [1, 2, 3];
let pairs = 0;
for (let i = 0; i + 1 < a.length; i++) pairs++; // compares a[i] with a[i + 1]
console.log(a[a.length], a.at(-1), pairs);      // undefined 3 2
