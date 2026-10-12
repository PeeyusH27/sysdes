import { buildPrefix, rangeSum } from './prefix-sums.js'; // @hide
import { longestSubarrayWithSum } from './prefix-map.js'; // @hide
import { buildPrefix2D, rectSum } from './prefix-2d.js'; // @hide
import { applyRangeAdds } from './difference-array.js'; // @hide
// Edit the inputs and press Run. These are the four templates on this page.
const prefix = buildPrefix([3, 1, 4, 1, 5, 9]);
console.log(prefix);                                         // [0, 3, 4, 8, 9, 14, 23]
console.log(rangeSum(prefix, 2, 4));                         // 10: 4 + 1 + 5

console.log(longestSubarrayWithSum([2, -1, 3, -2, 1, 4], 3)); // 5: [2, -1, 3, -2, 1]

const P = buildPrefix2D([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
console.log(rectSum(P, 1, 1, 2, 2));                         // 28: 5 + 6 + 8 + 9

console.log(applyRangeAdds(6, [[1, 3, 2], [2, 5, 3], [0, 1, -1]])); // [-1, 1, 5, 5, 3, 3]
