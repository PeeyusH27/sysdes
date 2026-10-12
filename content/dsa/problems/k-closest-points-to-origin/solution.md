### Intuition

Sorting all points by distance and taking the first `k` works in O(n log n). But we only need the `k` nearest, which is a top-k question: "the k **smallest** distances".

For the k smallest, keep a **max-heap of size k**. Its top is the **farthest** of the current candidates, the first one to throw out when a closer point shows up. Push each point; whenever the heap holds `k + 1` points, pop the farthest. At the end the heap holds the `k` closest points.

Compare **squared** distances `x² + y²`. Squaring doesn't change the order of non-negative numbers, and it avoids `Math.sqrt` and floating-point rounding.

### Step by step

1. Define `dist([x, y]) = x * x + y * y`.
2. Create a max-heap by distance: `new Heap((a, b) => dist(b) - dist(a))`.
3. For each point `p`:
   1. Push `p`.
   2. If the heap holds more than `k` points, pop the top (the farthest).
4. Pop the remaining points into the result. Any order is accepted.

### Dry run: `points = [[2, 2], [-1, 4], [0, -3], [5, 1]]`, `k = 2`

Squared distances: `[2, 2] → 8`, `[-1, 4] → 17`, `[0, -3] → 9`, `[5, 1] → 26`. The heap column lists distances from the top (farthest) down.

| point | dist | after push | size > 2? | heap afterwards |
|---|---|---|---|---|
| [2, 2] | 8 | 8 | no | 8 |
| [-1, 4] | 17 | 17, 8 | no | 17, 8 |
| [0, -3] | 9 | 17, 9, 8 | yes, pop 17 | 9, 8 |
| [5, 1] | 26 | 26, 9, 8 | yes, pop 26 | 9, 8 |

The heap ends with the points at distance 9 and 8: **[0, -3]** and **[2, 2]**.

### Why it works

At every step the heap holds the `k` closest points among those processed so far. A new point either belongs among them (then the old farthest is popped) or it is farther than all of them (then it is the farthest itself and gets popped right back out).

### Edge cases

- `k` equal to the number of points: nothing is ever popped during the walk; return them all.
- Duplicate points are separate entries, so `[[1, 1], [1, 1], [2, 2]]` with `k = 2` returns both copies of `[1, 1]`.
- Coordinates up to `10^4` give squared distances up to `2 * 10^8`, far below `Number.MAX_SAFE_INTEGER`.

### Common mistakes

- A **min**-heap of size `k`: popping the top would throw away the **closest** point.
- A comparator that returns a boolean, like `(a, b) => dist(a) > dist(b)`. Comparators must return a negative, zero or positive number.
- Returning the distances instead of the points.

### Other ways to solve it

- **Sort**: `points.sort((a, b) => dist(a) - dist(b)).slice(0, k)`, O(n log n).
- **Quickselect** on distance: average O(n), worst O(n²); it modifies the input.
