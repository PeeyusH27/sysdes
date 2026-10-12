// Defaults apply when the argument is missing or undefined (not when it is null).
function greet(name = 'friend') {
  return `hi ${name}`;
}
console.log(greet(), greet(undefined), greet(null)); // hi friend hi friend hi null

// A default can use earlier parameters: handy for recursive helpers.
function sumRange(nums, lo = 0, hi = nums.length - 1) {
  if (lo > hi) return 0;
  return nums[lo] + sumRange(nums, lo + 1, hi);
}
console.log(sumRange([1, 2, 3, 4]), sumRange([1, 2, 3, 4], 2)); // 10 7

// Default values are created fresh on every call, so a default [] or Map is never shared.
function collect(x, into = []) {
  into.push(x);
  return into;
}
console.log(collect(1), collect(2));     // [1] [2]

// Rest parameters gather the remaining arguments into a real array.
function maxOf(first, ...rest) {
  let best = first;
  for (const x of rest) if (x > best) best = x;
  return best;
}
console.log(maxOf(3, 9, 4), maxOf(7));   // 9 7
