import { buildAdjacency } from './adjacency.js'; // @hide
import { bfsDistances, gridSteps } from './bfs.js'; // @hide
import { countRegions, regionSizes } from './grid-dfs.js'; // @hide
import { distanceToNearest } from './multi-source-bfs.js'; // @hide
// Edit the inputs and press Run. The functions are the templates above.
const adj = buildAdjacency(6, [[0, 1], [0, 2], [1, 3], [2, 3], [4, 5]]);
console.log(adj);                       // [[1, 2], [0, 3], [0, 3], [1, 2], [5], [4]]
console.log(bfsDistances(adj, 0));      // [0, 1, 1, 2, -1, -1]: 4 and 5 are unreachable

const land = [
  [1, 1, 0, 0, 1],
  [1, 0, 0, 1, 1],
  [0, 0, 1, 0, 1],
];
console.log(countRegions(land), regionSizes(land)); // 3 [3, 4, 1]

const maze = ['..#.', '.##.', '....'];
console.log(gridSteps(maze, [0, 0], [0, 3]));       // 7

console.log(distanceToNearest(['E..', '.#.', '..E'])); // [[0, 1, 2], [1, -1, 1], [2, 1, 0]]
