### Intuition

Every step costs the same: one more cell. When all edges have the same cost, the shortest path is found by **breadth-first search**. BFS explores in rings: first every cell at distance 1, then every cell at distance 2, and so on. So the **first** time BFS reaches a cell, it got there by a shortest path, and the first time it reaches the bottom-right corner you can stop.

A depth-first search would also find *a* path, but not necessarily the shortest one, and trying every path is exponential.

### Step by step

1. If the start cell or the end cell is blocked, return `-1`.
2. Create `dist`, an `n × n` grid of zeros (0 means "not reached yet"). Set `dist[0][0] = 1`, because the start cell alone is a path of length 1.
3. Put `[0, 0]` in a queue and keep a `head` index instead of calling `shift()`.
4. While `head < queue.length`:
   1. Take `[r, c] = queue[head++]`. If it is the bottom-right cell, return `dist[r][c]`.
   2. For each of the 8 directions, compute the neighbour `(nr, nc)`. Skip it if it is outside the grid, blocked, or already reached.
   3. Otherwise set `dist[nr][nc] = dist[r][c] + 1` and push it. Marking it **now**, when it is pushed, stops it from being queued twice.
5. If the queue runs out, the corner can't be reached: return `-1`.

### Dry run: `[[0,1,0,0], [0,1,0,1], [0,0,1,0], [1,1,0,0]]`

| pop | dist | newly reached (with distance) |
|---|---|---|
| (0,0) | 1 | (1,0) = 2. Its other neighbours (0,1) and (1,1) are blocked. |
| (1,0) | 2 | (2,0) = 3, (2,1) = 3 |
| (2,0) | 3 | nothing new |
| (2,1) | 3 | (1,2) = 4 diagonally up, (3,2) = 4 diagonally down |
| (1,2) | 4 | (0,2) = 5, (0,3) = 5, (2,3) = 5 |
| (3,2) | 4 | (3,3) = 5 |
| … | | (0,2), (0,3) and (2,3) add nothing, then (3,3) is popped: return **5** |

### Edge cases

- `[[0]]`: the start is the end, so the answer is 1 (one cell), not 0.
- A blocked start or end cell means no path at all.
- A full row of 1s can't be crossed, even diagonally: diagonal moves still land on a cell of that row.

### Common mistakes

- Using only 4 directions. Diagonal moves are allowed, and they are often what makes a path short.
- Counting moves instead of cells. A path through 3 cells has length 3.
- Marking cells as visited when they are popped instead of when they are pushed: the same cell can be queued many times.
- `queue.shift()` is O(n) in JavaScript, which turns the BFS quadratic in the number of cells. Walk a `head` index instead.

### Other ways to solve it

A* search with the "king's move" distance `max(|dr|, |dc|)` to the corner as its heuristic explores fewer cells on open grids, but has the same worst case. For this problem, plain BFS is what interviewers expect.
