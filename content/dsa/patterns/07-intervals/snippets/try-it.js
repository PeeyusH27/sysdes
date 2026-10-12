import { mergeIntervals } from './merge.js'; // @hide
import { maxOverlap } from './sweep-line.js'; // @hide
import { minRooms } from './rooms-heap.js'; // @hide
// Edit the intervals and press Run. The functions are the templates above.
console.log(mergeIntervals([[7, 8], [2, 4], [10, 11], [1, 3], [4, 5]])); // [[1, 5], [7, 8], [10, 11]]
console.log(mergeIntervals([[1, 10], [2, 3]]));                         // [[1, 10]]  (nested: keep the max end)

const meetings = [[1, 5], [2, 6], [4, 8], [6, 9], [8, 10]];
console.log(maxOverlap(meetings), minRooms(meetings));                   // 3 3  (two ways, same answer)
console.log(maxOverlap([[1, 3], [3, 5]]));                               // 1    (back to back is fine)
