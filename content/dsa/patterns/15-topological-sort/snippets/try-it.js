import { topoSortKahn } from './kahn.js'; // @hide
import { topoSortDfs } from './dfs-topo.js'; // @hide
import { topoLevels } from './kahn-levels.js'; // @hide
// Edges are [from, to]: "from must come before to". Edit them and press Run.
const edges = [[0, 2], [1, 2], [2, 3], [1, 4], [4, 3]];
console.log(topoSortKahn(5, edges)); // [0, 1, 2, 4, 3]
console.log(topoSortDfs(5, edges));  // [1, 4, 0, 2, 3]: a different order, just as valid
console.log(topoLevels(5, edges));   // [[0, 1], [2, 4], [3]]: three rounds

const loop = [[0, 1], [1, 2], [2, 0]];
console.log(topoSortKahn(3, loop), topoSortDfs(3, loop), topoLevels(3, loop)); // [] [] null
