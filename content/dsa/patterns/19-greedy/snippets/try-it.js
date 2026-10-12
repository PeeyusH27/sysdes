import { findContentChildren } from './sort-then-greedy.js'; // @hide
import { maxNonOverlapping } from './interval-scheduling.js'; // @hide
import { greedyChange, minCoins } from './coins.js'; // @hide
// Edit the inputs and press Run. The functions are the templates above.
console.log(findContentChildren([3, 1, 6, 2, 4], [2, 1, 5, 3, 1]));        // 4
console.log(maxNonOverlapping([[5, 9], [1, 3], [6, 8], [2, 5], [8, 10], [4, 6]])); // 4

console.log(greedyChange([25, 10, 5, 1], 68), minCoins([25, 10, 5, 1], 68)); // [25, 25, 10, 5, 1, 1, 1] 7
console.log(greedyChange([4, 3, 1], 6), minCoins([4, 3, 1], 6));             // [4, 1, 1] 2  (greedy is wrong here)
