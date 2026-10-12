import { MinHeap } from './min-heap.js'; // @hide
import { bfsDistances } from './bfs-distances.js'; // @hide
import { dijkstra, shortestPath } from './dijkstra.js'; // @hide
import { bellmanFord } from './bellman-ford.js'; // @hide
// Edit the graphs and press Run. The functions are the templates above.
console.log(bfsDistances(5, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]], 0)); // [0, 1, 1, 2, 3]

const roads = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [3, 4, 3]];
console.log(dijkstra(5, roads, 0));            // [0, 3, 1, 4, 7]
console.log(shortestPath(5, roads, 0, 4));     // { dist: 7, path: [0, 2, 1, 3, 4] }

// A negative edge: node 1 is popped at distance 2 before 0 → 2 → 1 (cost 1) is found.
const tricky = [[0, 1, 2], [0, 2, 5], [2, 1, -4]];
console.log(shortestPath(3, tricky, 0, 1).dist); // 2 (wrong)
console.log(bellmanFord(3, tricky, 0));          // [0, 1, 5]

// At most 2 edges: the 3-edge route to node 3 is not allowed.
const flights = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 2, 5], [0, 3, 9]];
console.log(bellmanFord(4, flights, 0, 2));      // [0, 1, 2, 6]

const heap = new MinHeap();
[[5, 'e'], [1, 'a'], [3, 'c']].forEach((pair) => heap.push(pair));
console.log(heap.pop(), heap.pop());             // [1, 'a'] [3, 'c']
