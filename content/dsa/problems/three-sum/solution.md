### Intuition

Three nested loops try every triplet in O(n³) and then need a set to remove duplicates. Instead, reduce the problem to one you already know:

> Fix the first number `nums[i]`. The other two must add up to `-nums[i]`. That is **two sum on a sorted array**, solvable with opposite-end pointers in O(n).

Sorting first does two jobs: it makes the two-pointer search valid, and it puts equal values next to each other so duplicates are easy to skip.

### Step by step

1. Sort `nums` ascending with a numeric comparator: `nums.sort((a, b) => a - b)`.
2. For each index `i` from `0` to `n - 3`:
   1. If `nums[i] > 0`, stop: every number after it is also positive, so no triplet can sum to 0.
   2. If `i > 0` and `nums[i] === nums[i - 1]`, skip this `i`: the same first value would produce the same triplets again.
   3. Set `left = i + 1` and `right = n - 1`, and walk them inward:
      - `sum = nums[i] + nums[left] + nums[right]`.
      - `sum < 0` → `left++` (need a bigger number). `sum > 0` → `right--` (need a smaller one).
      - `sum === 0` → record the triplet, then move `left` forward past every copy of `nums[left]` and `right` backward past every copy of `nums[right]`, so the next match is a new pair.
3. Return the recorded triplets.

### Dry run: `[-1, 0, 1, 2, -1, -4]`

Sorted: `[-4, -1, -1, 0, 1, 2]`

| i | nums[i] | left / right walk | triplets found |
|---|---|---|---|
| 0 | -4 | needs 4: best pair is 1 + 2 = 3, never 4 | none |
| 1 | -1 | needs 1: (-1, 2) ✓ → skip; (0, 1) ✓ | [-1, -1, 2], [-1, 0, 1] |
| 2 | -1 | same value as i = 1 → **skip** | |
| 3 | 0 | needs 0: 1 + 2 = 3 too big… pointers meet | none |

### Why skipping duplicates is enough

Because the array is sorted, equal values are adjacent. Skipping repeated `i` values prevents the same first element twice; skipping repeated `left`/`right` values after a match prevents the same pair twice for one `i`. Together they guarantee each value-triplet appears exactly once, without a Set.

### Common mistakes

- `nums.sort()` without a comparator sorts numbers as strings, so `[10, 9, -1]` becomes `[-1, 10, 9]` and the pointer logic breaks.
- Skipping duplicates of `i` by comparing with `nums[i + 1]` instead of `nums[i - 1]` skips valid triplets like `[-1, -1, 2]`.
- Forgetting to move the pointers after recording a match causes an infinite loop.
