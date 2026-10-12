import { fromArray, toArray } from './list.js'; // @hide
import { middleNode } from './middle.js'; // @hide
import { cycleStart, hasCycle } from './cycle.js'; // @hide
import { floyd } from './sequence.js'; // @hide
// Edit the inputs and press Run. fromArray(values, pos) links the tail back to index pos (-1: no cycle).
console.log(toArray(middleNode(fromArray([1, 2, 3, 4, 5]))));     // [3, 4, 5]
console.log(toArray(middleNode(fromArray([1, 2, 3, 4, 5, 6]))));  // [4, 5, 6]

const looped = fromArray([3, 8, 5, 1, 9, 4, 7], 2);
console.log(hasCycle(looped), cycleStart(looped).val);            // true 5
console.log(hasCycle(fromArray([1, 2, 3])));                      // false

const digitSquares = (n) => String(n).split('').reduce((sum, d) => sum + d * d, 0);
console.log(floyd(digitSquares, 19)); // { start: 1, tail: 4, length: 1 }: 19 is happy
console.log(floyd(digitSquares, 2));  // { start: 4, tail: 1, length: 8 }: 2 is not
