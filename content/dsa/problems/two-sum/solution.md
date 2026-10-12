### Intuition

The brute force tries every pair with two nested loops: O(n²). Turn the question around. When you stand on `nums[i]`, you already know the **only** value that could complete a pair with it: `target - nums[i]`, its *complement*. The question becomes "have I already walked past the complement, and where?"

A hash map from value to index answers that in O(1) on average. So a single left-to-right pass is enough: each pair is discovered when the scan reaches its **second** element, because the first one is already in the map.

### Step by step

1. Create an empty `Map` called `indexOf` that maps a value to the index where it was seen.
2. For each index `i` from left to right:
   1. Compute `need = target - nums[i]`.
   2. If `indexOf.has(need)`, the pair is complete: return `[indexOf.get(need), i]`.
   3. Otherwise record the current value: `indexOf.set(nums[i], i)`.
3. The problem guarantees an answer, so the loop always returns.

### Dry run: `nums = [3, 1, 5, 7]`, `target = 6`

| i | nums[i] | need | map before the lookup | action |
|---|---|---|---|---|
| 0 | 3 | 3 | empty | 3 not seen → store 3 → 0 |
| 1 | 1 | 5 | 3 → 0 | 5 not seen → store 1 → 1 |
| 2 | 5 | 1 | 3 → 0, 1 → 1 | 1 was seen at 1 → **return [1, 2]** |

Look at `i = 0`: the complement of 3 is 3 itself. Because we look up **before** storing, the map is still empty and the 3 doesn't pair with itself.

### Why it works

Take the answer pair `(i, j)` with `i` before `j`. At step `i`, `nums[i]` is stored in the map. At step `j`, `need` equals `nums[i]`, so the lookup finds it. Nothing can stop that: the map only ever gains entries.

### Edge cases

- **Equal values**, like `[6, 6]` with target 12: at `i = 1` the lookup finds the first 6 at index 0 before the second 6 is stored.
- **Zero and negatives** need no special handling: `target - nums[i]` is plain arithmetic.
- **Repeated values that aren't in the answer**: storing a later index over an earlier one is harmless, since only one pair exists.

### Common mistakes

- Storing `nums[i]` **before** the lookup: with `[3, 1, 5, 7]` and target 6, the 3 finds itself and you return `[0, 0]`.
- Writing `if (indexOf.get(need))`: when the partner is at index 0, `get` returns `0`, which is falsy, and the pair is missed. Use `has`.
- Sorting first and using two pointers: that finds the values, but sorting moves them, so the original indices are lost unless you sort `[value, index]` pairs. It's also O(n log n).

### Other ways to solve it

- **Nested loops**: check every pair. O(n²) time, O(1) space. Fine to mention first, then improve.
- **Sort index pairs + two pointers**: O(n log n) time, O(n) space for the pairs. Worth it only if the input is already sorted, as in Two Sum on a Sorted Array.
