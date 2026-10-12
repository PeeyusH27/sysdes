### Intuition

The area of lines `left` and `right` is `(right - left) × min(height[left], height[right])`.

Start with the **widest** pair: `left = 0`, `right = n - 1`. Any other pair is narrower, so it can only win by being taller. Now ask: which line can we throw away?

Say `height[left]` is the shorter one. Every container that uses line `left` with some line inside `(left, right)` is **narrower** than the current one, and its water level is still at most `height[left]`. So none of them can beat the area we just computed. Line `left` is finished: move `left` inward. The same argument applies to `right` when it is the shorter one.

Each step discards one line for good, so the scan is O(n).

### Step by step

1. `left = 0`, `right = height.length - 1`, `best = 0`.
2. While `left < right`:
   1. `area = (right - left) * Math.min(height[left], height[right])`; `best = Math.max(best, area)`.
   2. If `height[left] < height[right]`, increase `left`; otherwise decrease `right`.
3. Return `best`.

### Dry run: `[1, 8, 6, 2, 5, 4, 8, 3, 7]`

| left | right | width × level | area | best | move |
|---|---|---|---|---|---|
| 0 (1) | 8 (7) | 8 × 1 | 8 | 8 | left (1 is shorter) |
| 1 (8) | 8 (7) | 7 × 7 | 49 | 49 | right |
| 1 (8) | 7 (3) | 6 × 3 | 18 | 49 | right |
| 1 (8) | 6 (8) | 5 × 8 | 40 | 49 | right (tie: either is fine) |
| 1 (8) | 5 (4) | 4 × 4 | 16 | 49 | right |
| 1 (8) | 4 (5) | 3 × 5 | 15 | 49 | right |
| 1 (8) | 3 (2) | 2 × 2 | 4 | 49 | right |
| 1 (8) | 2 (6) | 1 × 6 | 6 | 49 | right → pointers meet |

### Why ties are safe

When both lines are equally tall, any container that keeps either one is narrower and no taller, so both lines are finished. Moving either pointer is correct.

### Common mistakes

- Moving the **taller** line: the width drops and the level is still capped by the shorter line, so you can skip the true answer.
- Using the taller line's height in the area formula: water spills over the shorter side.
