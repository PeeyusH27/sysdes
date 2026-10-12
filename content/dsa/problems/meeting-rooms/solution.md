### Intuition

The brute force compares every pair of meetings: O(n²). Sorting by start time means you only ever need to compare **neighbours**.

Why? In start order, suppose meeting `A` clashes with some later meeting `C`, with other meetings in between. The meeting `B` right after `A` starts no later than `C` does, and `C` starts before `A` ends. So `B` also starts before `A` ends: `A` clashes with its neighbour `B`. If no neighbouring pair clashes, no pair at all does.

### Step by step

1. Sort a copy of the meetings by start time: `sort((a, b) => a[0] - b[0])`.
2. For each meeting from the second one on, compare its start with the previous meeting's end:
   - if `start < previousEnd`, the previous meeting is still running: return `false`;
   - if `start >= previousEnd`, the person can go straight from one to the next.
3. If no neighbours clash, return `true`.

### Dry run: `[[9, 10], [13, 15], [10, 12]]`

Sorted by start: `[[9, 10], [10, 12], [13, 15]]`.

| i | previous | current | current start < previous end? |
|---|---|---|---|
| 1 | [9, 10] | [10, 12] | 10 < 10: no, back to back is fine |
| 2 | [10, 12] | [13, 15] | 13 < 12: no |

No clash, so the answer is `true`. For `[[1, 5], [8, 9], [4, 6]]` the sorted order is `[[1, 5], [4, 6], [8, 9]]`, and the first check, `4 < 5`, already returns `false`.

### Edge cases

- No meetings or a single meeting: the loop never runs, so the answer is `true`.
- Two identical meetings: after sorting they are neighbours, and `start < end` catches them.
- One meeting inside another (`[1, 20]` and `[3, 4]`): `3 < 20`, a clash.

### Common mistakes

- Using `<=` instead of `<`: back-to-back meetings like `[2, 4]` and `[4, 6]` would count as a clash.
- Calling `intervals.sort()` with no comparator: it compares the arrays as strings, so `[10, 12]` sorts before `[9, 10]`.
- Forgetting to sort at all and only checking neighbours in the input order.
