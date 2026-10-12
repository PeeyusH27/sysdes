### Intuition

Comparing every interval of one list with every interval of the other works, but it is O(n · m) and ignores that both lists are sorted. Walk them together instead, with one pointer per list, the way you would merge two sorted arrays.

Two pieces of reasoning make it work:

- **The overlap of two closed intervals** `[a1, a2]` and `[b1, b2]` runs from the later start to the earlier end: `[max(a1, b1), min(a2, b2)]`. If that start is greater than that end, they don't overlap.
- **Which pointer to move.** Say `firstList[i]` ends first (`a2 < b2`). Every later interval in `secondList` starts after `b2`, which is after `a2`, so `firstList[i]` can't overlap any of them. It is finished: advance `i`. Otherwise advance `j` by the same argument.

### Step by step

1. Set `i = 0`, `j = 0` and an empty `result`.
2. While both pointers are inside their lists:
   1. Let `[a1, a2] = firstList[i]` and `[b1, b2] = secondList[j]`.
   2. `lo = Math.max(a1, b1)`, `hi = Math.min(a2, b2)`. If `lo <= hi`, push `[lo, hi]`.
   3. If `a2 < b2`, advance `i`; otherwise advance `j`.
3. Return `result`. It is already sorted, because the pointers only move forward.

### Dry run: `firstList = [[0, 3], [6, 9], [12, 15]]`, `secondList = [[2, 7], [10, 13]]`

| i | j | first[i] | second[j] | [max start, min end] | advance |
|---|---|---|---|---|---|
| 0 | 0 | [0, 3] | [2, 7] | [2, 3]: keep | i (3 < 7) |
| 1 | 0 | [6, 9] | [2, 7] | [6, 7]: keep | j (7 < 9) |
| 1 | 1 | [6, 9] | [10, 13] | [10, 9]: empty | i (9 < 13) |
| 2 | 1 | [12, 15] | [10, 13] | [12, 13]: keep | j (13 < 15) |
| 2 | 2 | | | j has run off the end: stop | |

Result: `[[2, 3], [6, 7], [12, 13]]`.

### Edge cases

- Either list empty: the loop never runs, and the answer is `[]`.
- Intervals that touch at one point produce a single-point interval such as `[5, 5]`, because the check is `lo <= hi`, not `lo < hi`.
- One long interval against many short ones: the long one stays put while the short ones are each clipped and passed.

### Common mistakes

- Advancing both pointers after a match: a long interval may overlap several intervals of the other list.
- Advancing the interval that **starts** first instead of the one that **ends** first.
- Using `lo < hi`, which drops single-point intersections.
