import { pairSum } from './opposite-ends.js'; // @hide
import { removeDuplicates } from './read-write.js'; // @hide
// Edit the inputs and press Run. pairSum and removeDuplicates are the templates above.
console.log(pairSum([1, 3, 4, 6, 8, 11], 10));   // [2, 3]
console.log(pairSum([2, 4, 5, 9], 12));          // [-1, -1]

const nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];
const k = removeDuplicates(nums);
console.log(k, nums.slice(0, k));                // 5 [0, 1, 2, 3, 4]
