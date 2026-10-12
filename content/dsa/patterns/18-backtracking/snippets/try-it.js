import { combinations } from './combinations.js'; // @hide
import { arrangements } from './arrangements.js'; // @hide
import { subsetsWithSum } from './subset-sum.js'; // @hide
import { countPaths } from './grid-paths.js'; // @hide
// Edit the inputs and press Run. The functions are the templates above.
console.log(combinations(4, 2));             // [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]
console.log(arrangements(['a', 'b', 'c'], 2).map((p) => p.join(''))); // ['ab', 'ac', 'ba', 'bc', 'ca', 'cb']
console.log(subsetsWithSum([4, 1, 3, 2], 5)); // [[1, 4], [2, 3]]

const grid = [
  [0, 0, 0],
  [0, 1, 0],   // 1 is a wall
  [0, 0, 0],
];
console.log(countPaths(grid));               // 2: along the top and right, or down the left and along the bottom
