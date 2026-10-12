### Intuition

In the input order, overlapping intervals can be far apart, and checking every pair over and over is slow. **Sort by start** and the picture becomes a left-to-right sweep: intervals that overlap now sit next to each other in runs.

Build the answer as you go. Keep the last merged interval "open". For each next interval (which starts no earlier than anything before it):

- If it starts at or before the open interval's end, it overlaps: stretch the end to cover it.
- If it starts after the end, there is a gap. Nothing later can reach back across that gap, because everything later starts even further right. The open interval is final; start a new one.

### Step by step

1. Sort a copy of the intervals by start: `sort((a, b) => a[0] - b[0])`.
2. Create an empty `merged` list.
3. For each `[start, end]` in sorted order, look at `last = merged.at(-1)`:
   1. If `last` exists and `start <= last[1]`, set `last[1] = Math.max(last[1], end)`.
   2. Otherwise push a new `[start, end]`.
4. Return `merged`.

### Dry run: `[[1, 4], [2, 6], [8, 10], [9, 12]]`

| interval | open interval | start <= its end? | merged after |
|---|---|---|---|
| [1, 4] | none | | [[1, 4]] |
| [2, 6] | [1, 4] | 2 ≤ 4: overlap, end becomes max(4, 6) | [[1, 6]] |
| [8, 10] | [1, 6] | 8 ≤ 6: no, a gap | [[1, 6], [8, 10]] |
| [9, 12] | [8, 10] | 9 ≤ 10: overlap, end becomes 12 | [[1, 6], [8, 12]] |

### Why it works

After sorting, every interval still to come starts at or after the current one. So once an interval starts **after** the open group's end, no later interval can touch that group either. Each group is closed exactly when the first gap appears, and the groups come out in sorted order.

### Common mistakes

- Writing `last[1] = end` instead of `Math.max(last[1], end)`: `[1, 10]` followed by `[2, 3]` shrinks to `[1, 3]`.
- Using `start < last[1]`: touching intervals like `[1, 3]` and `[3, 5]` stay separate, but they share the point 3.
- Sorting with `intervals.sort()` and no comparator: the inner arrays are compared as strings, so `[10, 12]` lands before `[2, 6]`.
- Skipping the sort: only intervals that happen to be adjacent in the input get merged.
