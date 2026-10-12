### Intuition

Checking every subarray is O(n²). Positivity is the key: adding an element always **increases** a window's sum, and removing one always **decreases** it. That makes a variable window safe.

Move `right` forward, adding each value to `sum`. As soon as `sum >= target` the window is valid, but maybe not the shortest that ends at `right`, so shrink it from the left **while it stays valid**, recording the length each time.

Why may `left` move forward for good? Once `[left, right]` reaches the target, any window that starts at `left` and ends further right is **longer**, so it can never beat the length just recorded. Index `left` has nothing more to offer.

### Step by step

1. Set `left = 0`, `sum = 0`, `best = Infinity`.
2. For each `right`:
   1. Add `nums[right]` to `sum`.
   2. While `sum >= target`:
      - Record `best = Math.min(best, right - left + 1)`.
      - Subtract `nums[left]` from `sum` and increase `left`.
3. Return `0` if `best` is still `Infinity`, otherwise `best`.

### Dry run: `target = 9`, `nums = [1, 4, 2, 7, 1, 3]`

| right | adds | sum | shrinking (record, then drop the left value) | best |
|---|---|---|---|---|
| 0 | 1 | 1 | | ∞ |
| 1 | 4 | 5 | | ∞ |
| 2 | 2 | 7 | | ∞ |
| 3 | 7 | 14 | [1, 4, 2, 7] len 4 → drop 1 (13); [4, 2, 7] len 3 → drop 4 (9); [2, 7] len 2 → drop 2 (7), stop | 2 |
| 4 | 1 | 8 | | 2 |
| 5 | 3 | 11 | [7, 1, 3] len 3 → drop 7 (4), stop | 2 |

Answer: `2`.

### Why it's O(n)

Both pointers only move forward, at most n times each, so the inner `while` does O(n) work in total across the whole run.

### Common mistakes

- Returning `Infinity` (or `nums.length`) when nothing reaches the target. The problem asks for `0`.
- Recording the length **after** the shrink loop: by then the sum has dropped below the target.
- Using `if` instead of `while`: one big value can make several left elements unnecessary at once.
- Reusing this on arrays with **negative** numbers: removing a value could then increase the sum, and the window logic breaks. That needs prefix sums with a monotonic deque instead.

### Other ways to solve it

- **Prefix sums + binary search**, O(n log n): the prefix sums of positive numbers are strictly increasing, so for each start you can binary-search the first end whose prefix sum reaches `prefix[start] + target`.
