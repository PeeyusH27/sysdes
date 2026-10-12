### Intuition

Before any edge is added, there are `n` components: every node alone. Now add the edges one at a time and ask, for each edge `[a, b]`: **were `a` and `b` already connected?**

- If not, the edge joins two components into one: the count drops by one.
- If they were, the edge only closes a loop inside one component: the count stays the same.

Union-find answers that question in almost O(1) per edge by comparing the roots of `a` and `b`, so the whole count takes one pass over the edges.

### Step by step

1. Build a union-find: `parent[i] = i`, `rank[i] = 0`, `count = n`.
2. For each edge `[a, b]`:
   1. `ra = find(a)`, `rb = find(b)` (with path compression).
   2. If `ra === rb`, skip: the edge is inside a component already.
   3. Otherwise attach the lower-rank root under the higher-rank one and do `count--`.
3. Return `count`.

### Dry run: `n = 6`, `edges = [[0,1], [1,2], [2,0], [3,4]]`

| edge | find(a) | find(b) | action | parent | count |
|---|---|---|---|---|---|
| start | | | | [0, 1, 2, 3, 4, 5] | 6 |
| [0, 1] | 0 | 1 | merge: parent[1] = 0, rank[0] = 1 | [0, 0, 2, 3, 4, 5] | 5 |
| [1, 2] | 0 | 2 | merge under the taller root: parent[2] = 0 | [0, 0, 0, 3, 4, 5] | 4 |
| [2, 0] | 0 | 0 | **same root**: closes the loop 0-1-2, skip | [0, 0, 0, 3, 4, 5] | 4 |
| [3, 4] | 3 | 4 | merge: parent[4] = 3 | [0, 0, 0, 3, 3, 5] | 3 |

Answer: **3** components: {0, 1, 2}, {3, 4} and {5}.

### Edge cases

- No edges: every node is alone, so the answer is `n`.
- Isolated nodes (like 5 above) never appear in `edges` but still count. Starting from `count = n` handles them for free.
- An edge can be listed as `[1, 0]` or `[0, 1]`; union doesn't care about direction.

### Common mistakes

- Returning `n - edges.length`. That only works when no edge closes a loop: in the dry run it gives 6 - 4 = 2, but the answer is 3.
- Counting distinct roots only over nodes that appear in `edges`, which forgets isolated nodes.
- Counting distinct values of `parent[i]` at the end instead of distinct `find(i)`: a parent is not always a root.

### Other ways to solve it

Build an adjacency list and run DFS or BFS from every unvisited node, counting the starts. That is O(n + E) time and space. Union-find needs no adjacency list and also works when edges arrive as a stream.
