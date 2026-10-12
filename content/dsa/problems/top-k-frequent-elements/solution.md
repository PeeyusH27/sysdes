### Intuition

This is two smaller problems glued together:

1. **How often does each value appear?** One pass with a `Map` from value to count.
2. **Which k values have the largest counts?** A top-k question, which a size-k min-heap answers.

Sorting all distinct values by count would also work, but it orders values we never return. A **min-heap ordered by count** that never holds more than `k` pairs keeps only the current top `k`: whenever it overflows, the least frequent pair on top is popped.

### Step by step

1. Build `count`: for each `x` in `nums`, `count.set(x, (count.get(x) ?? 0) + 1)`.
2. Create a min-heap of `[value, count]` pairs compared by count: `new Heap((a, b) => a[1] - b[1])`.
3. For each entry of `count`:
   1. Push it.
   2. If the heap holds more than `k` pairs, pop the one with the smallest count.
4. Pop everything left in the heap and collect the values. They can be returned in any order.

### Dry run: `nums = [4, 4, 4, 6, 6, 9]`, `k = 2`

Counts: `4 → 3`, `6 → 2`, `9 → 1`. The heap column lists pairs from smallest count (the top) upwards.

| entry | after push | size > 2? | heap afterwards |
|---|---|---|---|
| [4, 3] | [4, 3] | no | [4, 3] |
| [6, 2] | [6, 2], [4, 3] | no | [6, 2], [4, 3] |
| [9, 1] | [9, 1], [6, 2], [4, 3] | yes, pop [9, 1] | [6, 2], [4, 3] |

Popping the rest gives the values **6** and **4**.

### Why it works

The heap is the top-k pattern applied to counts: after each step it holds the `k` most frequent values among the entries processed so far, and the least frequent of those sits on top, ready to be evicted. The test data guarantees no tie for the last place, so the answer is unique.

### Common mistakes

- Counting with a plain object: keys become strings, so you return `"4"` instead of `4`. A `Map` keeps the number type.
- Ordering the heap by **value** instead of by **count**.
- Returning counts, or `[value, count]` pairs, instead of just the values.
- Pushing every distinct value into a max-heap and popping `k` times: correct, but O(m log m) for `m` distinct values instead of O(m log k).

### Other ways to solve it

- **Bucket sort, O(n)**: a count is between 1 and `n`, so make `buckets[c]` = the values that appear exactly `c` times. Walk the buckets from `n` down to 1, collecting values until you have `k`. This beats the heap asymptotically and is a great follow-up answer.
- **Sort the entries** by count descending and take the first `k`: O(m log m), simplest to write.
