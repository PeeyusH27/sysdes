### Intuition

Trying every subsequence is 2^n. A take-or-skip recursion is also exponential unless you notice what it keeps recomputing.

Use an **"ending at `i`" state**: `len[i]` = the length of the longest increasing subsequence whose **last element is `nums[i]`**. Fixing the last element makes the recurrence easy. The element just before `nums[i]` in such a subsequence is some `nums[j]` with `j < i` and `nums[j] < nums[i]`, and the best chain ending there has length `len[j]`. So extend the best of them:

`len[i] = 1 + max(len[j])` over every `j < i` with `nums[j] < nums[i]` (or just `1` if there is no such `j`).

The longest subsequence overall can end at any index, so the answer is the largest `len[i]`.

### Step by step

1. **State**: `len[i]` = length of the longest strictly increasing subsequence that ends with `nums[i]`.
2. **Recurrence**: `len[i] = 1 + max(len[j])` for `j < i` with `nums[j] < nums[i]`.
3. **Base case**: every `len[i]` starts at `1`, the element on its own.
4. **Order**: `i` from left to right; for each `i`, scan every `j` before it.
5. **Answer**: the maximum over all `len[i]` (track it in the loop as `best`).
6. **Space**: the look-back reaches any earlier index, so keep the whole array.

### Dry run: `[3, 1, 8, 2, 5, 9, 4, 6]`

| i | nums[i] | smaller earlier values (their len) | len[i] |
|---|---|---|---|
| 0 | 3 | none | 1 |
| 1 | 1 | none | 1 |
| 2 | 8 | 3 (1), 1 (1) | 2 |
| 3 | 2 | 1 (1) | 2 |
| 4 | 5 | 3 (1), 1 (1), 2 (2) | 3 |
| 5 | 9 | 3 (1), 1 (1), 8 (2), 2 (2), 5 (3) | **4** |
| 6 | 4 | 3 (1), 1 (1), 2 (2) | 3 |
| 7 | 6 | 3 (1), 1 (1), 2 (2), 5 (3), 4 (3) | **4** |

The best cell is 4 (reached at indices 5 and 7), so the answer is 4.

### Why it works

Every increasing subsequence has a last element `nums[i]`. Remove it and what remains is an increasing subsequence ending at some `nums[j]` with `j < i` and `nums[j] < nums[i]`, of length at most `len[j]`. So `len[i]` can't be larger than `1 + max(len[j])`, and that length is achievable by appending `nums[i]` to the best chain ending at `j`.

### Edge cases

- Duplicates: `[4, 4, 4]` gives 1 because the comparison is strict (`<`, not `<=`).
- Strictly decreasing input: no `j` ever qualifies, every `len[i]` is 1.
- The best chain may end before the last index (`[1, 3, 6, 7, 9, 4, 10, 5, 6]` ends at `10`), which is why the answer is not `len[n - 1]`.

### Common mistakes

- Returning `len[n - 1]` instead of the maximum over all cells.
- Using `<=`, which allows equal neighbours and over-counts duplicates.
- Treating it like a contiguous problem (Kadane-style, looking only at `i - 1`): a subsequence can skip elements.
- Exponential take-or-skip recursion without a memo: times out on the long, almost sorted test, where nearly every subset of a prefix is increasing.

### Other ways to solve it

**Patience sorting with binary search** (O(n log n) time, O(n) space). Keep an array `tails`, where `tails[k]` is the smallest possible last value of an increasing subsequence of length `k + 1`. For each number, binary-search the first entry in `tails` that is greater than or equal to it and overwrite that entry, or append the number if every entry is smaller. `tails` stays sorted, and its length is the answer. (It is not itself a valid subsequence; it only tracks the best possible endings.)
