### Intuition

A route is usable at time `t` exactly when **every** cell on it, including the start, has elevation at most `t`. So the earliest time a route works is its **highest cell**, and the answer is:

> the smallest possible "highest cell" over all routes from the top-left to the bottom-right.

That is a minimax path, and Dijkstra solves it with a different way of combining costs: extending a route that works at time `time` into a cell of elevation `h` gives `Math.max(time, h)`. That value never goes down as the route grows, which is all Dijkstra needs. Pop the cell with the earliest time, relax its neighbours, and stop when the bottom-right cell is popped.

### Step by step

1. `best` is an `n × n` grid of `Infinity`. The start can only be left once it is covered, so `best[0][0] = grid[0][0]`; push `[grid[0][0], 0, 0]`.
2. While the heap is not empty:
   1. Pop `[time, r, c]`. If `time > best[r][c]`, skip the stale entry.
   2. If `(r, c)` is the bottom-right cell, return `time`.
   3. For each of the 4 neighbours inside the grid: `next = Math.max(time, grid[nr][nc])`. If `next < best[nr][nc]`, store it and push `[next, nr, nc]`.

### Dry run: `[[0, 8, 7], [1, 6, 5], [2, 3, 4]]`

| pop [time, cell] | neighbours | heap after |
|---|---|---|
| [0, (0,0)] | (1,0): max(0, 1) = 1; (0,1): 8 | [1,(1,0)] [8,(0,1)] |
| [1, (1,0)] | (2,0): 2; (1,1): 6 | [2,(2,0)] [6,(1,1)] [8,(0,1)] |
| [2, (2,0)] | (2,1): 3 | [3,(2,1)] [6,(1,1)] [8,(0,1)] |
| [3, (2,1)] | (1,1): max(3, 6) = 6, no better; (2,2): 4 | [4,(2,2)] [6,(1,1)] [8,(0,1)] |
| [4, (2,2)] | bottom-right cell: return **4** | |

The route hugs the left and bottom edges (0, 1, 2, 3, 4), so it is fully under water at time 4. The 6 and the 8 are never needed.

### Edge cases

- `[[0]]`: you are already there at time 0.
- The start cell itself can be high: in `[[3, 0], [1, 2]]` you can't move before time 3, so the answer is 3 even though the rest of the route is lower.
- The answer is always at least `grid[n - 1][n - 1]` too, since you must stand on the destination.

### Common mistakes

- Starting with time 0 instead of `grid[0][0]`.
- Adding elevations together. Waiting is free; only the highest cell on the route matters.
- Returning when the target is pushed rather than popped.
- Simulating time one unit at a time and re-flooding from scratch at each `t`: up to n² floods of n² cells, O(n⁴).

### Other ways to solve it

- **Binary search on `t`** from 0 to n² - 1, with a BFS that only enters cells ≤ `t`: O(n² log n).
- **Union-find in time order**: since the elevations are exactly 0 to n² - 1, at time `t` exactly one new cell (elevation `t`) gets covered. Union it with its already-covered neighbours and stop at the first `t` where `(0,0)` and `(n-1,n-1)` share a root: O(n² · α(n²)).
