import { Heap } from './heap.js';

// Template 3: k-way merge. The next output is always the smallest of the k current heads,
// so keep one entry per input in a min-heap. Each of the N items is pushed and popped once: O(N log k).
export function mergeSortedArrays(arrays) {
  const heap = new Heap((a, b) => a.value - b.value);
  arrays.forEach((arr, list) => {
    if (arr.length > 0) heap.push({ value: arr[0], list, index: 0 });
  });
  const out = [];
  while (heap.size() > 0) {
    const { value, list, index } = heap.pop();
    out.push(value);
    const next = index + 1;
    if (next < arrays[list].length) heap.push({ value: arrays[list][next], list, index: next }); // advance that input
  }
  return out;
}
