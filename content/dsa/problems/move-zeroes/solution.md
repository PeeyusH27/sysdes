### Intuition

This is the **same-direction** (read/write) flavour of two pointers. `read` scans every element once. `write` marks where the next non-zero value belongs. Everything before `write` is already final: the non-zero values, in their original order.

When `read` meets a non-zero value we swap it into position `write`. The value that was at `write` is either a zero (which moves back, exactly where we want zeroes) or the same element (when no zero has been seen yet, `read === write` and the swap does nothing).

### Step by step

1. Set `write = 0`.
2. For each `read` from `0` to `nums.length - 1`:
   - If `nums[read]` is not zero, swap `nums[read]` and `nums[write]`, then increase `write`.
3. When the loop ends, indices `0 … write - 1` hold the non-zero values in order, and every index from `write` on holds a zero.

### Dry run: `[0, 1, 0, 3, 12]`

| read | value | action | nums after | write |
|---|---|---|---|---|
| 0 | 0 | skip | [0, 1, 0, 3, 12] | 0 |
| 1 | 1 | swap 0 ↔ 1 | [1, 0, 0, 3, 12] | 1 |
| 2 | 0 | skip | [1, 0, 0, 3, 12] | 1 |
| 3 | 3 | swap 1 ↔ 3 | [1, 3, 0, 0, 12] | 2 |
| 4 | 12 | swap 2 ↔ 4 | [1, 3, 12, 0, 0] | 3 |

### Why swapping keeps the order

`write` never passes `read`, and non-zero values are written to increasing `write` positions in the order `read` finds them. So their relative order can't change.

### Common mistakes

- `nums.filter(x => x !== 0)` builds a **new** array; the caller's `nums` is unchanged. Even `nums = …` only rebinds your local variable.
- `splice`-ing zeroes out while looping skips elements (indices shift) and is O(n²).
- Sorting with a comparator that sends zeroes last works only because sort is stable, and costs O(n log n).
