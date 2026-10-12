### Intuition

Rot spreads one step per minute, in all four directions, from **every** rotten orange at once. So the minute a fresh orange rots is its distance, in steps through oranges, from the **nearest** orange that was rotten at the start. The answer is the largest of those distances: the moment the last orange goes bad.

Shortest distances in an unweighted grid call for BFS. Because all the rotten oranges start spreading together, put **all of them** in the queue before the search begins. This is a **multi-source BFS**; it behaves exactly like a normal BFS from an imaginary source joined to every rotten orange.

Process the queue one level at a time. Everything in the queue at the start of a level is rotten at the same minute, and the fresh oranges it infects form the next level.

### Step by step

1. Scan the grid. Push every rotten orange `[r, c]` onto `queue` and count the fresh ones in `fresh`.
2. Set `minutes = 0` and `head = 0`.
3. While `head < queue.length` and `fresh > 0`:
   1. Remember `levelEnd = queue.length`: the oranges that are rotten right now.
   2. Pop each orange up to `levelEnd`. For each neighbour that is fresh (`1`), set it to `2`, decrease `fresh`, and push it.
   3. Increase `minutes`.
4. Return `minutes` if `fresh === 0`, otherwise `-1`.

The `fresh > 0` condition stops the loop as soon as the last orange rots, so no extra empty minute is counted at the end.

### Dry run: `[[2,1,1,0],[0,1,0,1],[1,1,1,1]]`

There are 8 fresh oranges at the start.

| minute | oranges that rot during this minute | fresh left |
|---|---|---|
| 0 | none yet: the queue holds (0,0) | 8 |
| 1 | (0,1) | 7 |
| 2 | (0,2), (1,1) | 5 |
| 3 | (2,1) | 4 |
| 4 | (2,0), (2,2) | 2 |
| 5 | (2,3) | 1 |
| 6 | (1,3) | 0, so return 6 |

The empty cell at `(1,2)` forces the rot to go around through the bottom row, which is why `(1,3)` is the last to go.

### Why it works

BFS from a set of sources visits cells in order of their distance to the nearest source, one level per step. A fresh orange is queued at the level equal to that distance, which is exactly the minute the rot reaches it. Turning it rotten as soon as it is queued means no other orange queues it again, so each cell is processed once.

### Edge cases

- **No fresh oranges at all** (including a grid with no oranges): return 0, even if nothing is rotten.
- **Fresh oranges but nothing rotten:** the queue starts empty, `fresh` stays positive, return -1.
- **A fresh orange walled off by empty cells:** it is never queued, so `fresh` never reaches 0: -1.

### Common mistakes

- Running a separate BFS from each rotten orange. Each fresh orange must be timed from its **nearest** source, and the separate searches can't tell which one that is. They also cost O((m·n)²).
- Increasing `minutes` once per orange popped instead of once per level.
- Counting one more minute after the last orange rots (the final level infects nothing). Stop when `fresh` reaches 0, or subtract one at the end.
- Using `queue.shift()`, which is O(n) per call. Use a head index.
