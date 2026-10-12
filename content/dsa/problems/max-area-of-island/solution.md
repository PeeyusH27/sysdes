### Intuition

This is the same graph as Number of Islands: land cells joined to their land neighbours up, down, left and right. Instead of counting the islands, measure each one and keep the biggest.

A DFS that **returns the number of cells it visited** does the measuring. The area of the island around a cell is 1 (the cell itself) plus the area found from each of its four neighbours, as long as no cell is counted twice. Sinking a cell (setting it to 0) the moment the search enters it guarantees that.

### Step by step

1. Define `area(r, c)`:
   1. If `(r, c)` is outside the grid or `grid[r][c] !== 1`, return 0.
   2. Set `grid[r][c] = 0` so the cell can't be counted again.
   3. Return `1 + area(r + 1, c) + area(r - 1, c) + area(r, c + 1) + area(r, c - 1)`.
2. Set `best = 0`. For every cell that is still `1`, update `best = Math.max(best, area(r, c))`.
3. Return `best`.

### Dry run: `[[0,1,1,0,0,0],[0,1,0,0,1,1],[0,0,0,1,1,0],[1,0,0,0,1,0],[1,1,0,0,0,0]]`

| scan reaches | cells sunk by `area` (in visiting order) | area | best |
|---|---|---|---|
| (0,1) | (0,1), (1,1), (0,2) | 3 | 3 |
| (1,4) | (1,4), (2,4), (3,4), (2,3), (1,5) | 5 | 5 |
| (3,0) | (3,0), (4,0), (4,1) | 3 | 5 |

Every other `1` was already sunk when the scan reached it, so the answer is 5.

Inside `area(1, 4)`: going down reaches (2,4), which goes down to (3,4) (area 1, all its other neighbours are water) and left to (2,3) (area 1), so `area(2, 4)` returns 1 + 1 + 1 = 3. Back at (1,4), going right adds (1,5), for 1 + 3 + 1 = 5.

### Why it works

Each call either returns 0 straight away or sinks one new land cell and counts it once, plus whatever its neighbours count. So a call started on an unvisited land cell returns exactly the number of cells in its island. The scan starts one call per island, and `best` keeps the largest.

### Edge cases

- **No land at all:** `area` is never called and `best` stays 0. Starting from `Math.max(...areas)` on an empty list would give `-Infinity`.
- **Diagonal neighbours** are separate islands: `[[1,0,1],[0,1,0],[1,0,1]]` has five islands of area 1.
- **A ring of land around a lake** is one island; land inside the lake is another.

### Common mistakes

- Sinking the cell *after* the recursive calls. The neighbours call straight back into it, so it is counted again and again, or the recursion never ends.
- Using a counter outside the function and forgetting to reset it before each island.
- Returning the number of islands instead of the largest area.

### Other ways to solve it

An explicit stack or a BFS queue that adds 1 for every cell it pops gives the same areas without recursion. Union-find with a size per root also works: the answer is the largest set size.
