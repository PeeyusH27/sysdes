### Intuition

You could append `newInterval`, sort, and run the merge-intervals sweep: O(n log n). But the list is **already sorted and disjoint**, so one pass is enough.

Relative to `newInterval`, the existing intervals fall into three consecutive groups:

1. those that end **before** it starts (`end < newStart`): they come first and are untouched;
2. those that **overlap** it: they all melt into one bigger interval;
3. those that start **after** it ends (`start > newEnd`): they come last and are untouched.

Because the list is sorted, the groups appear in exactly that order, so three simple loops over one index handle them.

### Step by step

1. Copy `newInterval` into `start` and `end`, and set `i = 0`.
2. While `intervals[i]` ends before `start` (`intervals[i][1] < start`), push it to the result and move on.
3. While `intervals[i]` starts at or before `end` (`intervals[i][0] <= end`), it overlaps: grow the new interval with `start = Math.min(start, intervals[i][0])` and `end = Math.max(end, intervals[i][1])`, then move on.
4. Push `[start, end]`.
5. Push every remaining interval.

### Dry run: `intervals = [[1, 3], [4, 6], [8, 10], [12, 15]]`, `newInterval = [5, 9]`

| step | interval | test | start, end | result so far |
|---|---|---|---|---|
| before | [1, 3] | 3 < 5: ends before | 5, 9 | [[1, 3]] |
| before | [4, 6] | 6 < 5: no, stop this loop | 5, 9 | [[1, 3]] |
| overlap | [4, 6] | 4 ≤ 9: overlaps | 4, 9 | [[1, 3]] |
| overlap | [8, 10] | 8 ≤ 9: overlaps | 4, 10 | [[1, 3]] |
| overlap | [12, 15] | 12 ≤ 10: no, push [4, 10] | 4, 10 | [[1, 3], [4, 10]] |
| after | [12, 15] | copy | | [[1, 3], [4, 10], [12, 15]] |

### Edge cases

- Empty list: both loops skip, and the result is just `newInterval`.
- `newInterval` before everything or after everything: group 2 is empty, and it is pushed in the right place.
- `newInterval` touching an interval at a single point (`[4, 6]` next to `[1, 4]`): step 2 uses a strict `<` and step 3 uses `<=`, so touching counts as overlapping.
- `newInterval` inside an existing interval: the min/max leave the bigger interval unchanged.

### Common mistakes

- Using `<=` in the "ends before" test: `[1, 4]` and a new `[4, 6]` would not be merged.
- Updating only `end` while absorbing: if the first overlapping interval starts earlier than `newInterval`, `start` must move left too.
- Forgetting to push the merged interval when there is nothing after it (the push must happen after the loop, not inside the "after" loop).
