### Intuition

The direct approach asks, for every cell, "where can rain from here end up?" and runs a separate downhill search from each cell. That is O((m·n)²): far too slow for a 200 × 200 map.

Turn the question around. Instead of following water **downhill from each cell**, start **at an ocean** and walk **uphill**: from a cell, step to a neighbour whose height is **greater than or equal to** it. Water on that neighbour could flow down into the current cell, and from there to the ocean. One search started from every Pacific-edge cell at once finds every cell that drains into the Pacific. A second search from the Atlantic edge does the same for the Atlantic. The answer is the set of cells that both searches reached.

Each search is a multi-source traversal: every cell on that ocean's edges is a starting point.

### Step by step

1. Collect the starting cells. Pacific: every cell in row 0 and every cell in column 0. Atlantic: every cell in the last row and every cell in the last column.
2. Write `canReach(starts)`:
   1. Create a `seen` grid filled with `false`. Mark each start as seen and push it onto a stack.
   2. Pop `[r, c]`. For each neighbour inside the grid that isn't seen yet and has `heights[nr][nc] >= heights[r][c]`, mark it seen and push it.
   3. When the stack is empty, return `seen`.
3. Run `pacific = canReach(pacificStarts)` and `atlantic = canReach(atlanticStarts)`.
4. Return every `[r, c]` with `pacific[r][c] && atlantic[r][c]`.

### Dry run: `heights = [[1,3,2,4],[2,4,3,3],[3,2,5,1],[4,1,2,2]]`

| row | heights | reached from the Pacific | reached from the Atlantic | in both |
|---|---|---|---|---|
| 0 | 1 3 2 4 | all four (top edge) | only column 3 (right edge): the 2 beside it is lower than the 4 and the 3 that the Atlantic search reaches around it, so the climb stops there | (0,3) |
| 1 | 2 4 3 3 | all four: 2 is on the left edge, 4 and 3 climb from the row above, the last 3 climbs from the 3 beside it | columns 1–3 | (1,1), (1,2), (1,3) |
| 2 | 3 2 5 1 | column 0 (edge) and column 2 (the 5 climbs from the 3 above it) | all four: 1 is on the edge, the 5 and the 2 climb from the bottom row, the 3 climbs from the 2 | (2,0), (2,2) |
| 3 | 4 1 2 2 | column 0 (left edge) | all four (bottom edge) | (3,0) |

The answer is `[[0,3],[1,1],[1,2],[1,3],[2,0],[2,2],[3,0]]`, in any order.

### Why it works

Water moves from a cell to a neighbour of lower or equal height. Reverse every such move and you get "from a cell to a neighbour of greater or equal height". Rain on a cell can reach an ocean exactly when a chain of reversed moves leads from that ocean's edge to the cell, and that is precisely what the search from the edge explores. Each search visits every cell at most once.

### Edge cases

- **A single cell, a single row or a single column:** every cell touches both oceans.
- **Flat areas:** water crosses equal heights in both directions, so the climb must use `>=`, not `>`.
- **The top-right and bottom-left corners** touch both oceans directly and are always in the answer.

### Common mistakes

- Climbing with `>` instead of `>=`: plateaus of equal height get cut off.
- Walking the wrong way: moving to *lower* neighbours from the ocean finds where water from the ocean would go, which is meaningless here.
- Searching from every cell separately: correct, but O((m·n)²).
- Reusing one `seen` grid for both oceans, so the second search stops early.
