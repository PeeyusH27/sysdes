import { Heap } from './heap.js'; // @hide
import { kLargest, kSmallestBy } from './top-k.js'; // @hide
import { mergeSortedArrays } from './k-way-merge.js'; // @hide
import { runningMedians } from './two-heaps.js'; // @hide
// Edit the inputs and press Run. Heap and the helpers are the templates above.
const heap = new Heap((a, b) => a - b);          // min-heap; (a, b) => b - a for a max-heap
[5, 3, 8, 1, 4].forEach((x) => heap.push(x));
console.log(heap.peek(), heap.size());           // 1 5
console.log(heap.pop(), heap.pop(), heap.pop()); // 1 3 4

console.log(kLargest([3, 1, 5, 12, 2, 11, 7], 3));             // [12, 11, 7]
const dist = ([x, y]) => x * x + y * y;
console.log(kSmallestBy([[3, 3], [1, -2], [-4, 0], [0, 1]], 2, dist)); // [[0, 1], [1, -2]]

console.log(mergeSortedArrays([[1, 4, 9], [2, 3, 10], [5, 6]])); // [1, 2, 3, 4, 5, 6, 9, 10]
console.log(runningMedians([6, 2, 9, 1]));                       // [6, 4, 6, 4]
