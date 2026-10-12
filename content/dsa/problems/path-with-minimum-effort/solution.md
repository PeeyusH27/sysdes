### Intuition

Think of every cell as a node and every move as an edge whose weight is the height difference. The cost of a route is not the **sum** of its weights but the **largest** one. Dijkstra still works, because what Dijkstra really needs is that extending a route never makes it cheaper:

`newEffort = Math.max(effort, |heights[next] - heights[current]|)` is never smaller than `effort`.

So the cell with the smallest known effort can't be improved later, exactly like the closest node in ordinary Dijkstra. Keep a min-heap of `[effort, row, col]`, always expand the smallest, and the first time you pop the bottom-right cell you have the answer.

### Step by step

1. `best` is a `rows × cols` grid of `Infinity`, with `best[0][0] = 0`. Push `[0, 0, 0]`.
2. While the heap is not empty:
   1. Pop `[effort, r, c]`. If `effort > best[r][c]`, it is stale: skip it.
   2. If `(r, c)` is the bottom-right cell, return `effort`. It was popped, so nothing can beat it.
   3. For each of the 4 neighbours `(nr, nc)` inside the grid:
      - `next = Math.max(effort, Math.abs(heights[nr][nc] - heights[r][c]))`.
      - If `next < best[nr][nc]`, store it and push `[next, nr, nc]`.

### Dry run: `[[1, 10, 6], [3, 4, 9]]`

| pop [effort, cell] | neighbours | heap after |
|---|---|---|
| [0, (0,0)] h=1 | (0,1): max(0, 9) = 9; (1,0): max(0, 2) = 2 | [2,(1,0)] [9,(0,1)] |
| [2, (1,0)] h=3 | (1,1): max(2, 1) = 2 | [2,(1,1)] [9,(0,1)] |
| [2, (1,1)] h=4 | (0,1): max(2, 6) = 6 beats 9; (1,2): max(2, 5) = 5 | [5,(1,2)] [6,(0,1)] [9,(0,1)] |
| [5, (1,2)] | bottom-right cell: return **5** | |

The route 1 → 3 → 4 → 9 has steps 2, 1 and 5. Going through the 10 would cost 9. The old `[9,(0,1)]` entry is left in the heap; it would have been skipped as stale.

### Why it works

Efforts only grow along a route, and the heap always hands out the smallest effort still waiting. When a cell is popped with its best effort, every other unfinished route already has an effort at least as large, and extending it can't bring it down. So the popped value is final, and in particular the first pop of the target is the minimum.

### Common mistakes

- Adding up the differences. That answers a different question (least total climbing).
- Returning when the target is **pushed**. A pushed value can still be beaten by a route that is popped later; only popping makes it final.
- Marking cells visited when pushed, BFS style. That freezes the first effort found and blocks later improvements such as `(0,1)` going from 9 to 6 above.
- Exploring every route with DFS and backtracking: exponential on a 100 × 100 grid.

### Other ways to solve it

- **Binary search on the answer**: for a limit `E`, BFS from the start using only steps with difference ≤ `E` and check whether the corner is reached. The smallest `E` that works is the answer: O(R·C · log(max height)).
- **Union-find**: sort all neighbour pairs by height difference and union them in that order. The difference at which the start and the corner first share a root is the answer (Kruskal style), O(R·C · log(R·C)).
