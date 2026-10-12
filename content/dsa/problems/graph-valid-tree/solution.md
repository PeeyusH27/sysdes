### Intuition

You need to check two things, connected and no cycle, but a counting fact lets you check only one of them:

> A graph on `n` nodes with **exactly `n - 1` edges** is a tree if and only if it has **no cycle**.

Why: start with `n` separate nodes. Every edge that does **not** close a cycle joins two separate pieces, so the number of pieces drops by one. After `n - 1` such edges there is exactly `n - (n - 1) = 1` piece: the graph is connected.

So: reject any edge count other than `n - 1`, then use union-find to make sure no edge closes a cycle. An edge closes a cycle exactly when its two ends already have the same root.

### Step by step

1. If `edges.length !== n - 1`, return `false`. Fewer edges can't connect `n` nodes; more must contain a cycle.
2. Build a union-find over `n` nodes.
3. For each edge `[a, b]`:
   1. If `find(a) === find(b)`, return `false`: `a` and `b` are already connected, so this edge makes a cycle.
   2. Otherwise union them.
4. Return `true`.

### Dry run: `n = 4`, `edges = [[0,1], [1,2], [2,0]]`

The count check passes (3 edges, `n - 1 = 3`), so the union-find has to catch the problem.

| edge | find(a) | find(b) | action | pieces left |
|---|---|---|---|---|
| start | | | | 4 |
| [0, 1] | 0 | 1 | merge: parent[1] = 0 | 3 |
| [1, 2] | 0 | 2 | merge: parent[2] = 0 | 2 |
| [2, 0] | 0 | 0 | **same root**: cycle 0-1-2 | return `false` |

Node 3 was never connected. With the right number of edges, a cycle somewhere always means a missing connection somewhere else, and vice versa.

### Edge cases

- `n = 1`, no edges: `0 === n - 1`, no unions, so it is a tree.
- `n = 2`, no edges: the count check fails (two separate nodes).
- `n = 4`, `[[0,1], [2,3]]`: no cycle at all, but only 2 edges, so the count check rejects it.

### Common mistakes

- Only checking for cycles. Two separate trees have no cycle but are not one tree: `n = 4`, `[[0,1], [2,3]]` must be `false`.
- Only checking the edge count. A triangle plus a lonely node has `n - 1` edges and is not a tree.
- A DFS cycle check on an undirected graph that doesn't skip the edge it came in on: every edge then looks like a cycle (`0 → 1 → back to 0`).

### Other ways to solve it

Check `edges.length === n - 1`, build an adjacency list, then BFS or DFS from node 0 and confirm that all `n` nodes are visited. That is O(n + E) time and space and just as good; union-find avoids building the adjacency list.
