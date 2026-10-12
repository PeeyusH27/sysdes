### Intuition

The signal travels along every route at once, so each node receives it at the length of its **shortest** route from `k`. The last node to hear it is the one with the largest shortest-path distance. So: compute the shortest distance from `k` to every node, and return the maximum (or `-1` if one is unreachable).

Edges have different non-negative weights, so BFS is not enough. This is exactly what **Dijkstra's algorithm** does:

- Keep `dist[v]`, the best time found so far for each node, starting at `Infinity` (and `0` for `k`).
- Repeatedly take the not-yet-settled node with the **smallest** `dist`. Its time is final: every other route would pass through a node that is at least as far away and then add a non-negative weight.
- Relax its outgoing edges: if going through it reaches a neighbour sooner, lower that neighbour's `dist`.

A min-heap of `[time, node]` finds the smallest quickly. JavaScript has no heap, so you write a small one. Instead of updating entries already inside the heap, push a new entry and **skip stale ones** when they come out (lazy deletion).

### Step by step

1. Build an adjacency list `adj[u] = [[v, w], …]` with `n + 1` slots (labels start at 1).
2. `dist = new Array(n + 1).fill(Infinity)`, `dist[k] = 0`, and push `[0, k]` onto the heap.
3. While the heap is not empty:
   1. Pop `[d, u]`, the entry with the smallest time.
   2. If `d > dist[u]`, skip it: a faster entry for `u` was already processed.
   3. For each edge `[v, w]` of `u`: if `d + w < dist[v]`, set `dist[v] = d + w` and push `[dist[v], v]`.
4. Take the maximum of `dist[1]` to `dist[n]`. If it is `Infinity`, return `-1`; otherwise return it.

### Dry run: `times = [[1,2,4], [1,3,1], [3,2,2], [2,4,1]]`, `n = 4`, `k = 1`

| pop [d, u] | action | dist[1..4] | heap after |
|---|---|---|---|
| start | | [0, ∞, ∞, ∞] | [0,1] |
| [0, 1] | relax 1→2 (4) and 1→3 (1) | [0, 4, 1, ∞] | [1,3] [4,2] |
| [1, 3] | 3→2: 1 + 2 = 3 beats 4 | [0, 3, 1, ∞] | [3,2] [4,2] |
| [3, 2] | 2→4: 3 + 1 = 4 | [0, 3, 1, 4] | [4,2] [4,4] |
| [4, 2] | **stale**: 4 > dist[2] = 3, skip | | [4,4] |
| [4, 4] | no outgoing edges | | empty |

The largest distance is **4**, so every node has the signal at time 4.

### Why it works

When an entry `[d, u]` is popped and is not stale, every entry still in the heap has time at least `d`, and weights are never negative. Any other route to `u` would have to leave through one of those nodes and could only get longer, so `dist[u]` is final. Each node is settled once, and every node reachable from `k` is settled eventually.

### Common mistakes

- `Math.max(...dist)` over the whole array: `dist[0]` is an unused slot that stays `Infinity`, so the answer is always `-1`. Look at indices 1 to n only.
- Using BFS (fewest edges) instead of the smallest total time: 1→2 directly is one edge but slower than 1→3→2.
- Returning the sum of the distances, or the time of the last node *popped*. The question is the largest shortest distance.
- Skipping the stale check is not wrong, just wasteful: a stale entry can't improve anything. Forgetting to push after lowering `dist[v]` *is* wrong.

### Other ways to solve it

- **O(n²) Dijkstra without a heap**: scan all unsettled nodes for the smallest `dist` each time. With n ≤ 100 this is perfectly fine and shorter to write.
- **Bellman-Ford**: relax every edge n - 1 times, O(n · E). Slower, but it also works with negative weights.
- **Floyd–Warshall**: all pairs in O(n³). Overkill for one source.
