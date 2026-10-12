// Maps, Object.entries and arr.entries() all yield [key, value] pairs: unpack them in the loop head.
const freq = new Map([['a', 3], ['b', 1], ['c', 2]]);
const parts = [];
for (const [ch, n] of freq) parts.push(`${ch}=${n}`);
console.log(parts.join(' '));                      // a=3 b=1 c=2

for (const [i, x] of [7, 3, 9].entries()) {
  if (x === 9) console.log('9 is at index', i);    // 9 is at index 2
}

// Edge lists: [from, to, weight] triples straight into an adjacency list.
const edges = [[0, 1, 4], [0, 2, 1], [2, 1, 2]];
const adj = Array.from({ length: 3 }, () => []);
for (const [u, v, w] of edges) adj[u].push([v, w]);
console.log(adj);                                  // [[[1, 4], [2, 1]], [], [[1, 2]]]

// Callbacks can destructure their parameter too.
const intervals = [[1, 3], [2, 6], [8, 10]];
console.log(intervals.map(([start, end]) => end - start)); // [2, 4, 2]

// BFS: a queue of [row, col, dist] tuples.
const queue = [[0, 0, 0], [0, 1, 1]];
let qHead = 0;
const [r, c, d] = queue[qHead++];
console.log(r, c, d);                              // 0 0 0

// Object destructuring: by name, with renaming, nesting and defaults.
const node = { val: 5, left: { val: 3 }, right: null };
const { val, left: { val: leftVal }, right } = node;
console.log(val, leftVal, right);                  // 5 3 null
function area({ w, h = 1 }) {
  return w * h;
}
console.log(area({ w: 4, h: 2 }), area({ w: 4 })); // 8 4
