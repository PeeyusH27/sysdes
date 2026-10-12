import { maxWindowSum } from './fixed-window.js'; // @hide
import { longestAtMostKDistinct } from './longest-window.js'; // @hide
import { shortestSumAtLeast } from './shortest-window.js'; // @hide
import { windowMax } from './window-max.js'; // @hide
// Edit the inputs and press Run. These are the four templates on this page.
console.log(maxWindowSum([2, 1, 5, 1, 3, 2], 3));          // 9: the window [5, 1, 3]
console.log(longestAtMostKDistinct('abcbbca', 2));         // 5: "bcbbc"
console.log(shortestSumAtLeast([3, 1, 4, 1, 5, 9], 12));   // 2: [5, 9]
console.log(windowMax([5, 3, 4, 1, 6, 2, 2], 3));          // [5, 4, 6, 6, 6]
