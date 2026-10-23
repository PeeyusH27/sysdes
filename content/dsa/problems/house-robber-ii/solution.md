### Intuition

On a straight street this is the classic house-robber DP. The circle adds one rule: house `0` and house `n - 1` touch. In any valid plan you **cannot rob both**, so at least one of them is left alone. That splits the problem into two straight-street problems:

- never rob the last house: solve the line `nums[0 .. n-2]`;
- never rob the first house: solve the line `nums[1 .. n-1]`.

Every valid circular plan fits in one of those two cases, and every plan found in either case is valid in the circle. The answer is the larger of the two.

### Step by step

1. If there is one house, return `nums[0]`.
2. Define `robLine(lo, hi)` with two variables, `skip` (best total up to two houses back) and `take` (best total up to the previous house). For each house `i` compute `next = max(take, skip + nums[i])`, then `skip = take` and `take = next`.
3. Return `max(robLine(0, n - 2), robLine(1, n - 1))`.

### Dry run: `[1, 2, 3, 1]`

| case | houses considered | best |
|---|---|---|
| skip last | `[1, 2, 3]` | rob 1 and 3 = **4** |
| skip first | `[2, 3, 1]` | rob 2 and 1, or just 3 = 3 |

The answer is 4.

### Edge cases

- One house: both ranges would be empty, which would wrongly give 0, hence the special case.
- Two houses: each range is a single house, so the answer is the larger one.
- All zeros: the answer is 0.

### Common mistakes

- Running the line algorithm once on the whole array and forgetting that houses `0` and `n - 1` conflict.
- Excluding both the first and last house in the same pass; that loses plans which use one of them.
- Missing the `n === 1` case.
