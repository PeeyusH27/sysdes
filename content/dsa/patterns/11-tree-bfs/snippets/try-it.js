import { fromArray } from './tree.js'; // @hide
import { levelMaxes, levelValues } from './level-loop.js'; // @hide
import { shallowestDepth, isLeaf } from './first-match.js'; // @hide
import { Queue } from './queue.js'; // @hide
// Edit the trees (level order, null = missing child) and press Run. The functions are the templates above.
const root = fromArray([8, 3, 10, 1, 6, null, 14, null, null, 4, 7]);
console.log(levelValues(root));                 // [[8], [3, 10], [1, 6, 14], [4, 7]]
console.log(levelMaxes(root));                  // [8, 10, 14, 7]
console.log(shallowestDepth(root, isLeaf));     // 3 (leaves 1 and 14 are on level 3)

// shift() vs a head index on a 50,000-item queue. Double the length and watch shift() take about 4x as long.
const items = Array.from({ length: 50000 }, (_, i) => i);
let t = Date.now();
const a = [...items];
while (a.length) a.shift();
console.log('shift():', Date.now() - t, 'ms');    // around 100 ms, and it grows quadratically
t = Date.now();
const q = new Queue();
for (const x of items) q.push(x);
while (q.size) q.shift();
console.log('head index:', Date.now() - t, 'ms'); // a few ms at most
