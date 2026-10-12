### Intuition

A rectangle is only as tall as the **shortest bar it covers**. So the best rectangle is "the widest rectangle of height `heights[i]`" for some bar `i`, and that rectangle stretches left and right until it meets a **shorter** bar on each side:

`area(i) = heights[i] × (rightLimit - leftLimit - 1)`

where `leftLimit` is the index of the nearest shorter bar on the left (or `-1`), and `rightLimit` the nearest shorter bar on the right (or `n`). Finding both limits by scanning outwards from every bar is O(n²). A **monotonic increasing stack** finds them in one pass.

Keep a stack of indices whose heights increase from bottom to top. When bar `i` is not taller than the bar on top, the top bar can't extend any further to the right, so it is **resolved**, and both of its limits are known:

- its right limit is `i`,
- its left limit is the index **just below it on the stack**: every bar between them was taller and has already been popped.

Pop it, measure its rectangle, and repeat while the new top is still at least as tall as bar `i`. At the very end, pretend there is one extra bar of height 0 so every bar still on the stack gets resolved.

### Step by step

1. `stack = []`, `best = 0`.
2. For `i` from `0` to `n` (one step past the last bar):
   1. Let `h = heights[i]`, or `0` when `i === n`.
   2. While the stack is not empty and `heights[top] >= h`:
      - pop `top`;
      - `left` is the new top of the stack, or `-1` if the stack is now empty;
      - `width = i - left - 1`, and `best = Math.max(best, heights[top] * width)`.
   3. Push `i`.
3. Return `best`.

### Dry run: `[2, 4, 5, 1, 3, 3]`

| i (h) | popped bar (height) | left | width | area | stack after (heights) | best |
|---|---|---|---|---|---|---|
| 0 (2) | | | | | 2 | 0 |
| 1 (4) | | | | | 2, 4 | 0 |
| 2 (5) | | | | | 2, 4, 5 | 0 |
| 3 (1) | 2 (5) | 1 | 1 | 5 | 2, 4 | 5 |
| | 1 (4) | 0 | 2 | 8 | 2 | 8 |
| | 0 (2) | -1 | 3 | 6 | 1 | 8 |
| 4 (3) | | | | | 1, 3 | 8 |
| 5 (3) | 4 (3) | 3 | 1 | 3 | 1, 3 | 8 |
| 6 (0) | 5 (3) | 3 | 2 | 6 | 1 | 8 |
| | 3 (1) | -1 | 6 | 6 | 0 | 8 |

The 4 is measured when the short bar at index 3 arrives: it spans indices 1 to 2, giving 4 × 2 = 8.

### Why it works

- **Every measured rectangle fits.** When `top` is popped by bar `i`, the bars strictly between `left` and `i` are all at least as tall as `heights[top]`: the ones on its left were popped earlier by bars no taller than they are, and the ones on its right weren't short enough to pop it.
- **The best rectangle is measured.** Look at an optimal rectangle and its rightmost shortest bar `r`. The bars just outside the rectangle are shorter than `heights[r]` (otherwise the rectangle could grow), and the bars inside to the right of `r` are strictly taller. So when `r` is popped, its limits are exactly the rectangle's edges.
- **Ties are safe.** With `>=`, a bar is popped by an equal bar to its right and gets a width that is too small, but the equal bar on the right is measured later with a left limit that reaches past it.
- **O(n).** Every index is pushed once and popped once.

### Common mistakes

- Skipping the final flush. In an increasing histogram like `[1, 2, 3, 4, 5]` nothing is ever popped inside the loop, so nothing is measured. The extra height-0 step at `i === n` fixes it.
- Computing the width as `i - top`. The rectangle also extends to the **left** of the popped bar, over the taller bars that were popped before it: use `i - left - 1`.
- Using `top - 1` as the left limit instead of the index now on top of the stack.

### Other ways to solve it

- Two passes with a monotonic stack: fill `leftLimit[i]` (nearest shorter bar on the left) and `rightLimit[i]` (nearest shorter bar on the right) into arrays, then take the maximum of `heights[i] * (rightLimit[i] - leftLimit[i] - 1)`. Still O(n), and easier to debug.
- Divide and conquer around the shortest bar: O(n log n) on average, but O(n²) on sorted input.
