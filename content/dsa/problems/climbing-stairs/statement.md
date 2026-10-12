You are at the bottom of a staircase with `n` steps. Each move climbs either **one** step or **two** steps.

Return how many different sequences of moves take you from the bottom (step 0) to exactly the top (step `n`). Two sequences are different if they differ in at least one move, so climbing `1 + 2` and climbing `2 + 1` count separately.

### Constraints

- `1 <= n <= 45`
- The answer fits in a 32-bit signed integer.
- The larger tests are too big for a recursion that recomputes the same steps: an exponential solution times out.
