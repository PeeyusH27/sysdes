// Template 3: one pointer per input (or both ends of one input) feeding an output.
// The largest square of a sorted array sits at one of its two ends, so fill the result from the back.
export function sortedSquares(nums) {
  const out = new Array(nums.length);
  let left = 0;
  let right = nums.length - 1;
  for (let pos = nums.length - 1; pos >= 0; pos--) {
    const a = nums[left] ** 2;
    const b = nums[right] ** 2;
    if (a > b) {
      out[pos] = a;
      left++;
    } else {
      out[pos] = b;
      right--;
    }
  }
  return out;
}

// The same shape merges two sorted arrays: compare the heads, take the smaller, advance that pointer.
export function mergeSorted(a, b) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}
