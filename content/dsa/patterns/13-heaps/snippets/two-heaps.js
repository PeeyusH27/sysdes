import { Heap } from './heap.js';

// Template 4: two heaps. `low` (a max-heap) holds the smaller half, `high` (a min-heap) the larger half,
// with low.size() === high.size() or one more. The median is then low's top, or the average of both tops.
export function runningMedians(nums) {
  const low = new Heap((a, b) => b - a);
  const high = new Heap((a, b) => a - b);
  const medians = [];
  for (const x of nums) {
    low.push(x);
    high.push(low.pop());                                       // keeps every low value <= every high value
    if (high.size() > low.size()) low.push(high.pop());         // keeps the sizes balanced
    medians.push(low.size() > high.size() ? low.peek() : (low.peek() + high.peek()) / 2);
  }
  return medians;
}
