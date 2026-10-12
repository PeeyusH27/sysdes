// "Remove every val in place": a write pointer, then cut the tail with length.
function removeValue(nums, val) {
  let w = 0;
  for (const x of nums) if (x !== val) nums[w++] = x;
  nums.length = w;
  return w;
}
const nums = [3, 2, 2, 3, 4];
console.log(removeValue(nums, 3), nums);     // 3 [2, 2, 4]: the caller's array changed

// filter builds a NEW array; reassigning the parameter doesn't reach the caller.
function removeWithFilter(arr, val) {
  arr = arr.filter((x) => x !== val);
  return arr.length;
}
const other = [3, 2, 2, 3, 4];
console.log(removeWithFilter(other, 3), other); // 3 [3, 2, 2, 3, 4]: unchanged

// reverse and fill work in place and return the same array.
const a = [1, 2, 3, 4, 5];
console.log(a.reverse() === a);              // true
a.fill(0, 3);                                // from index 3 to the end
console.log(a);                              // [5, 4, 3, 0, 0]

// flat returns a new array with nested arrays spread out.
console.log([[1], [2, [3]]].flat(), [[1], [2, [3]]].flat(Infinity)); // [1, 2, [3]] [1, 2, 3]
