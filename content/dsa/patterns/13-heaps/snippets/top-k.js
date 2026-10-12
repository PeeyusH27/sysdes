import { Heap } from './heap.js';

// Template 2: top k. To keep the k LARGEST values, keep a MIN-heap of size k: its top is the
// weakest of the current top k, the one to evict when something bigger arrives. O(n log k).
export function kLargest(nums, k) {
  const heap = new Heap((a, b) => a - b);
  for (const x of nums) {
    heap.push(x);
    if (heap.size() > k) heap.pop();   // drop the smallest: it is not in the top k
  }
  const out = [];
  while (heap.size() > 0) out.push(heap.pop());
  return out.reverse();                // largest first
}

// The mirror image: the k SMALLEST items by some key need a MAX-heap of size k.
export function kSmallestBy(items, k, key) {
  const heap = new Heap((a, b) => key(b) - key(a));
  for (const item of items) {
    heap.push(item);
    if (heap.size() > k) heap.pop();   // drop the largest key
  }
  const out = [];
  while (heap.size() > 0) out.push(heap.pop());
  return out.reverse();                // smallest key first
}
