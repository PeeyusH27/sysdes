### Intuition

Define `best[i]` as the cheapest total to **arrive at position `i`**, not counting the price of step `i` itself (you pay that only when you leave it). You can start on step 0 or 1, so `best[0] = best[1] = 0`.

You reach position `i` from one of two places: from `i - 1` after paying `cost[i - 1]`, or from `i - 2` after paying `cost[i - 2]`. Take the cheaper:

`best[i] = min(best[i-1] + cost[i-1], best[i-2] + cost[i-2])`

The top is position `n`, so the answer is `best[n]`. Each value uses only the two before it, so no array is needed.

### Step by step

1. Start with `twoBack = 0` and `oneBack = 0` (positions 0 and 1).
2. For `i` from `2` to `n`:
   1. Compute `here = min(oneBack + cost[i-1], twoBack + cost[i-2])`.
   2. Shift: `twoBack = oneBack`, `oneBack = here`.
3. Return `oneBack`.

### Dry run: `[10, 15, 20]`

| i | via i-1 | via i-2 | best[i] |
|---|---|---|---|
| 0 | | | 0 |
| 1 | | | 0 |
| 2 | 0 + cost[1] = 15 | 0 + cost[0] = 10 | 10 |
| 3 (top) | 10 + cost[2] = 30 | 0 + cost[1] = 15 | **15** |

### Edge cases

- Two steps: `best[2] = min(cost[1], cost[0])`, so you simply pick the cheaper step and jump to the top.
- Zeros in `cost` make some paths free; the recurrence handles them without special cases.

### Common mistakes

- Returning `min(best[n-1], best[n-2])` as the answer: those exclude the price of the last step you stand on.
- Adding `cost[i]` when you arrive at `i`, which mis-prices the top (there is no `cost[n]`).
- Forgetting you may start on step 1 for free.
