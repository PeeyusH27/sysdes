### Intuition

Strip away the story: you want the longest **contiguous** subarray with **at most two distinct values**. Checking every start and end is O(n²). A sliding window does it in one pass because the property is *monotone*: if a window has at most two kinds, any smaller window inside it does too, and if a window has three kinds, any larger window around it does too. So we can grow the right edge, and whenever the window becomes invalid, move the left edge forward just enough to fix it.

To know when a kind has disappeared from the window, keep a **count per kind**. A kind is removed from the map only when its count drops to zero.

### Step by step

1. Create an empty map `count`, set `left = 0` and `best = 0`.
2. For each `right` from 0 to the end:
   1. Add one to `count` for `fruits[right]`.
   2. While `count` has more than 2 keys:
      1. Subtract one from the count of `fruits[left]`.
      2. If it reaches 0, delete that key.
      3. Move `left` one step right.
   3. Update `best = max(best, right - left + 1)`.
3. Return `best`.

### Dry run: `[1, 2, 3, 2, 2]`

| right | fruit | count after adding | after shrinking | window | best |
|---|---|---|---|---|---|
| 0 | 1 | {1:1} | | [1] | 1 |
| 1 | 2 | {1:1, 2:1} | | [1,2] | 2 |
| 2 | 3 | {1:1, 2:1, 3:1} | drop 1, left=1: {2:1, 3:1} | [2,3] | 2 |
| 3 | 2 | {2:2, 3:1} | | [2,3,2] | 3 |
| 4 | 2 | {2:3, 3:1} | | [2,3,2,2] | **4** |

### Edge cases

- One or two kinds in the whole row: the answer is the full length.
- All different kinds (`[1, 2, 3, 4]`): the answer is 2.
- Shrinking must remove a kind only when its *count* reaches zero. Deleting the key as soon as one copy leaves is the classic bug.

### Common mistakes

- Resetting the window to start at the last position when a third kind appears. That forgets the run of the second kind just before it (`[1, 2, 2, 2, 3]` needs the three 2s).
- Using `if` instead of `while` for shrinking. Because we remove one fruit at a time, one step may not be enough.
- Computing the length as `right - left` instead of `right - left + 1`.

### Other ways to solve it

**Last-seen indices**: keep only the two kinds in the window and where the most recent run of each began. When a third kind arrives, restart from the beginning of the latest run. O(n) time and O(1) space, but the indexing is trickier than the map version.
