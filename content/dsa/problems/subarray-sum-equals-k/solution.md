### Intuition

Fixing a start and extending the end with a running sum checks all subarrays in O(n²). A sliding window can't help here: with negative numbers, adding an element may make the sum smaller, so there is no safe direction to move.

Use **prefix sums** instead. Let `P(j)` be the sum of the first `j + 1` elements, and `P(-1) = 0` for the empty prefix. The subarray from `i + 1` to `j` sums to `P(j) - P(i)`. So

`P(j) - P(i) = k`  exactly when  `P(i) = P(j) - k`.

Standing at index `j`, the number of subarrays that **end at `j`** and sum to `k` is the number of **earlier** prefixes whose sum equals `P(j) - k`. Count prefix sums in a `Map` as you go, and this is the complement lookup from [Hash Maps and Sets](/dsa/patterns/hashing), applied to running sums.

### Step by step

1. Create `seen = new Map([[0, 1]])`: the empty prefix has sum 0 and has occurred once. It lets subarrays that start at index 0 be counted.
2. Set `sum = 0` and `count = 0`.
3. For each value `x`:
   1. Add it: `sum += x`.
   2. Add `seen.get(sum - k) ?? 0` to `count`.
   3. Record the current prefix: increase `seen.get(sum)` by 1.
4. Return `count`.

### Dry run: `nums = [1, 2, 1, 2, 1]`, `k = 3`

| index | x | sum | sum - k | times seen | count | new entry in seen |
|---|---|---|---|---|---|---|
| start | | 0 | | | 0 | 0 → 1 |
| 0 | 1 | 1 | -2 | 0 | 0 | 1 → 1 |
| 1 | 2 | 3 | 0 | 1 | 1 | 3 → 1 |
| 2 | 1 | 4 | 1 | 1 | 2 | 4 → 1 |
| 3 | 2 | 6 | 3 | 1 | 3 | 6 → 1 |
| 4 | 1 | 7 | 4 | 1 | 4 | 7 → 1 |

Answer: `4`. For example, at index 3 the prefix sum 3 was seen once (after index 1), so the subarray after it, `[1, 2]` at indices 2–3, sums to 3.

### Edge cases

- **Zeros** make the same prefix sum repeat: in `[0, 0, 0]` with `k = 0`, every pair of equal prefixes forms a subarray, 6 in total. That's why the map stores counts, not just presence.
- **Negative k** or negative values need nothing special.
- No subarray matches: the lookups all return 0.

### Common mistakes

- Forgetting the starting entry `0 → 1`: subarrays that begin at index 0 are never counted.
- Recording `sum` **before** the lookup: with `k = 0`, each prefix matches itself and counts an empty subarray.
- Using a `Set` instead of counts, which undercounts as soon as a prefix sum repeats.
- Using a sliding window: it silently fails once negative numbers appear.
