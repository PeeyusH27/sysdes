import { binarySearch } from './classic.js'; // @hide
import { lowerBound, upperBound } from './lower-bound.js'; // @hide
import { shipWithinDays } from './answer-space.js'; // @hide
// Edit the inputs and press Run. The functions are the templates above.
const nums = [1, 3, 3, 3, 5, 8, 9];
console.log(binarySearch(nums, 8));                     // 5
console.log(binarySearch(nums, 4));                     // -1
console.log(lowerBound(nums, 3), upperBound(nums, 3));  // 1 4  (the 3s fill indices 1 to 3)
console.log(upperBound(nums, 3) - lowerBound(nums, 3)); // 3    (how many 3s)
console.log(lowerBound(nums, 4));                       // 4    (where 4 would be inserted)

console.log(shipWithinDays([4, 2, 3, 1, 2], 3));        // 5
