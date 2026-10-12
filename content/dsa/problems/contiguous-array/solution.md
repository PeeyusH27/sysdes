### Intuition

Checking every subarray and counting its 0s and 1s is O(n²). Re-label the values: count each **1 as +1** and each **0 as -1**. A subarray with as many 0s as 1s is now a subarray that **sums to 0**.

Keep a running sum, the **balance** = (1s so far) - (0s so far). A subarray from `i + 1` to `j` sums to 0 exactly when the balance after `i` equals the balance after `j`. So the question becomes: for each `j`, what is the **earliest** index where the same balance appeared? The earliest one gives the longest subarray.

A `Map` from balance to its first index answers that in O(1). Seed it with balance `0` at index `-1` (before the array starts), so subarrays that begin at index 0 are found too.

### Step by step

1. Create `firstIndex = new Map([[0, -1]])`, and set `balance = 0`, `best = 0`.
2. For each index `i`:
   1. Add `+1` to `balance` for a 1, or `-1` for a 0.
   2. If `balance` is already in the map, the subarray after `firstIndex.get(balance)` up to `i` is balanced: update `best` with `i - firstIndex.get(balance)`.
   3. Otherwise, store `balance → i`. Never overwrite an existing entry.
3. Return `best`.

### Dry run: `nums = [0, 0, 1, 0, 1, 1, 0]`

| i | nums[i] | balance | seen before? | length | best |
|---|---|---|---|---|---|
| start | | 0 | stored at -1 | | 0 |
| 0 | 0 | -1 | new → store at 0 | | 0 |
| 1 | 0 | -2 | new → store at 1 | | 0 |
| 2 | 1 | -1 | first at 0 | 2 - 0 = 2 | 2 |
| 3 | 0 | -2 | first at 1 | 3 - 1 = 2 | 2 |
| 4 | 1 | -1 | first at 0 | 4 - 0 = 4 | 4 |
| 5 | 1 | 0 | first at -1 | 5 - (-1) = 6 | 6 |
| 6 | 0 | -1 | first at 0 | 6 - 0 = 6 | 6 |

Answer: `6` (indices 0 to 5, or 1 to 6).

### Edge cases

- All the same value: the balance never repeats, so the answer is 0.
- The whole array is balanced: the balance returns to 0 at the end and matches the seed at index -1.

### Common mistakes

- Forgetting the seed `0 → -1`: a balanced prefix such as `[0, 1]` is never found.
- Updating the map on every index: later indices overwrite earlier ones and the lengths come out too short. Store each balance only the first time.
- Keeping the 0s as 0: the running sum then counts only 1s, and "sum is 0" no longer means "balanced".
- Reaching for a sliding window: balance isn't monotonic in the window size, so there's no rule for when to shrink.
