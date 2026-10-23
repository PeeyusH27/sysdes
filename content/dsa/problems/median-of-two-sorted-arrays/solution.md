### Intuition

Merging the arrays and reading the middle is easy and O(m + n). The median does not need the whole merged order, though. It only needs a **cut** that splits the merged order into a left half and a right half of the right sizes, where every element on the left is <= every element on the right.

Suppose you take `i` elements from `A` and `j = half - i` elements from `B` to form the left half (`half = (m + n + 1) / 2`, rounded down). Because each array is sorted on its own, the cut is valid exactly when the two cross-checks hold:

- `A[i-1] <= B[j]` (the last A on the left is not bigger than the first B on the right)
- `B[j-1] <= A[i]`

The only free choice is `i`, and the checks are monotonic in it, so binary search finds it. Search on the **shorter** array so that `j` never goes negative.

### Step by step

1. Make `A` the shorter array and `B` the longer one. Let `m = A.length`, `n = B.length`, `half = floor((m + n + 1) / 2)`.
2. Binary search `i` in `[0, m]`, and set `j = half - i`.
3. Read the four neighbours of the cut, using `-Infinity` when you run off the left end and `Infinity` when you run off the right end: `aLeft = A[i-1]`, `aRight = A[i]`, `bLeft = B[j-1]`, `bRight = B[j]`.
4. If `aLeft > bRight`, you took too many from `A`: move `hi = i - 1`. If `bLeft > aRight`, you took too few: `lo = i + 1`.
5. Otherwise the cut is valid. `leftMax = max(aLeft, bLeft)`. If `m + n` is odd, return `leftMax`. If even, return `(leftMax + min(aRight, bRight)) / 2`.

### Dry run: `A = [1, 3]`, `B = [2, 4, 5]`

`m = 2`, `n = 3`, `half = 3`, total is odd.

| lo | hi | i | j | aLeft | aRight | bLeft | bRight | result |
|---|---|---|---|---|---|---|---|---|
| 0 | 2 | 1 | 2 | 1 | 3 | 4 | 5 | `bLeft 4 > aRight 3`: lo = 2 |
| 2 | 2 | 2 | 1 | 3 | ∞ | 2 | 4 | valid cut, odd: return max(3, 2) = **3** |

Merged order is `[1, 2, 3, 4, 5]`, whose middle is 3.

### Edge cases

- One array empty: `A` is the empty array, `m = 0`, so `i = 0` and the answer is read from `B` only. The infinities make the checks pass.
- All elements of `A` smaller than all of `B` (or the reverse): `i` ends at `m` or `0`.
- Duplicates are fine because both checks use `<=`/`>` rules that allow equality.

### Common mistakes

- Binary searching the longer array: `j = half - i` can then go negative or beyond `n`.
- Forgetting the infinity sentinels and indexing outside the arrays.
- Using integer division for the even case: the median of `[1, 2]` is `1.5`.
- Using `half = (m + n) / 2` for odd totals, which puts the middle element on the wrong side.

### Other ways to solve it

**Merge** into one sorted array: O(m + n), simplest. **Two-pointer walk** to the middle without building the merged array: O(m + n) time, O(1) space. **k-th element** recursion that discards k/2 elements per step: also O(log(m + n)).
