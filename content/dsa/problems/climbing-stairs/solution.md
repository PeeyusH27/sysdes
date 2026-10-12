### Intuition

Think about the **last move**. To stand on step `n`, your final move started either on step `n - 1` (a one-step) or on step `n - 2` (a two-step). Those two groups of climbs have nothing in common (they end with different moves), and together they contain every climb. So:

`ways(n) = ways(n - 1) + ways(n - 2)`

Written as plain recursion this is correct but exponential: `ways(n - 1)` and `ways(n - 2)` both recompute `ways(n - 3)`, and the same happens all the way down the call tree. `n = 45` needs billions of calls. Yet there are only `n + 1` different questions, `ways(0)` to `ways(n)`. Answer each once, from the bottom up, and since each answer needs only the previous two, two variables are enough.

### Step by step

1. **State**: `ways[i]` = the number of different move sequences that end exactly on step `i`.
2. **Recurrence**: `ways[i] = ways[i - 1] + ways[i - 2]`, because the last move was a one-step or a two-step.
3. **Base cases**: `ways[0] = 1` (standing at the bottom: one way, the empty climb) and `ways[1] = 1` (a single one-step).
4. **Order**: `i` from 2 up to `n`, so both cells it reads are already known.
5. **Answer**: `ways[n]`.
6. **Space**: keep only the last two values.
   1. Start with `prev2 = 1` (step 0) and `prev1 = 1` (step 1).
   2. For each `i` from 2 to `n`: `current = prev1 + prev2`, then `prev2 = prev1` and `prev1 = current`.
   3. Return `prev1`.

### Dry run: `n = 5`

| i | ways[i - 2] | ways[i - 1] | ways[i] |
|---|---|---|---|
| 0 | | | 1 (base) |
| 1 | | | 1 (base) |
| 2 | 1 | 1 | 2 |
| 3 | 1 | 2 | 3 |
| 4 | 2 | 3 | 5 |
| 5 | 3 | 5 | **8** |

### Why it works

Every climb to step `i` has exactly one last move. The climbs ending in a one-step are "any climb to `i - 1`, then one step", and the climbs ending in a two-step are "any climb to `i - 2`, then two steps". The two groups don't overlap and nothing is left out, so adding their sizes counts every climb exactly once.

### Edge cases

- `n = 1`: the loop never runs and the answer is `prev1 = 1`.
- `ways[0] = 1` may look strange, but it is what makes `ways[2] = 2` come out right: there is one way to have climbed nothing.
- The counts grow like the Fibonacci numbers. `n = 45` gives 1,836,311,903, still an exact integer in JavaScript.

### Common mistakes

- Plain recursion without a memo: right for small `n`, but it times out around `n = 35` to `45`.
- Setting `ways[0] = 0`, which breaks every later count (`ways[2]` would be 1).
- Looping `i < n` instead of `i <= n`, which returns the count for `n - 1` steps.
- Updating the variables in the wrong order: `prev1 = current` before `prev2 = prev1` throws away the old `prev1`.
