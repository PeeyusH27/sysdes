### Intuition

Re-sorting on every `findMedian` costs O(n log n) per call. Keeping a sorted array makes `findMedian` O(1) but every insert O(n).

The median only depends on the **middle** of the sorted order. So split the numbers into two halves:

- `low`, the smaller half, in a **max-heap**: its top is the largest of the small numbers.
- `high`, the larger half, in a **min-heap**: its top is the smallest of the large numbers.

If every value in `low` is at most every value in `high`, and `low` has the same size as `high` or one more, then the two tops sit right at the middle. With an odd count the median is `low`'s top; with an even count it is the average of both tops.

### Step by step

1. `low = new Heap((a, b) => b - a)` (max-heap) and `high = new Heap((a, b) => a - b)` (min-heap).
2. `addNum(num)`:
   1. Push `num` into `low`.
   2. Pop `low`'s top and push it into `high`. Whatever `num` was, the largest value of the small side has now moved to the large side, so the order rule holds.
   3. If `high` now has more values than `low`, pop `high`'s top and push it into `low`.
3. `findMedian()`: if `low` is bigger, return `low.peek()`; otherwise return `(low.peek() + high.peek()) / 2`.

### Dry run: add 6, 2, 9, 1

Heap contents are listed in sorted order.

| add | push into low | move low's top to high | rebalance | low | high | median |
|---|---|---|---|---|---|---|
| 6 | low: 6 | 6 → high | high bigger: 6 → low | 6 | | **6** |
| 2 | low: 2, 6 | 6 → high | sizes equal | 2 | 6 | (2 + 6) / 2 = **4** |
| 9 | low: 2, 9 | 9 → high | high bigger: 6 → low | 2, 6 | 9 | **6** |
| 1 | low: 1, 2, 6 | 6 → high | sizes equal | 1, 2 | 6, 9 | (2 + 6) / 2 = **4** |

### Why it works

Step 2 guarantees the **order** rule: after pushing into `low` and moving its maximum to `high`, nothing left in `low` is bigger than anything in `high`. Step 3 guarantees the **size** rule and keeps the order rule, because it moves `high`'s minimum, which is at least everything in `low`. With both rules in place, the sorted order is "all of `low`, then all of `high`", and the middle element(s) are exactly the two tops.

Each `addNum` does at most three pushes and two pops: O(log n). `findMedian` only peeks: O(1).

### Common mistakes

- Pushing each number into whichever heap is smaller, without checking values: sizes stay balanced but `low` can end up holding a value bigger than `high`'s top, and the median is wrong.
- Getting the comparators backwards: `low` must be a **max**-heap (`(a, b) => b - a`).
- Returning `high.peek()` for an odd count when your size rule keeps the extra value in `low` (or the reverse). Pick one rule and read the median from the matching heap.
- Sorting inside `findMedian`: correct, but too slow when both methods are called tens of thousands of times.

### Other ways to solve it

- **Sorted array with binary-search insertion**: `findMedian` is O(1) but each insert shifts elements, O(n).
- If all numbers were in a small range like `[0, 100]`, a **count array** of 101 buckets would give O(1) inserts and an O(100) median: a common interview follow-up.
