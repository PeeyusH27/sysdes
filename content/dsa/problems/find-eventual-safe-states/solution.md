### Intuition

A node is unsafe exactly when some walk from it can go on forever. In a finite graph, that means it can reach a cycle. Safe nodes are the ones from which every road ends at a dead end.

Work backwards from the dead ends:

- A terminal node (no outgoing edges) is safe.
- A node whose edges **all** lead to safe nodes is safe too.

That is Kahn's algorithm run on the **reversed** graph, using **out-degrees** in place of in-degrees. Start from the nodes with out-degree 0. Each time a node is proven safe, every node with an edge into it has one more edge confirmed safe, so decrease its out-degree. A node whose out-degree reaches 0 has had every edge confirmed, so it's safe. Nodes on a cycle, or with any edge leading towards one, never get there.

### Step by step

1. Build `parents[v]`, every `u` with an edge `u → v`, and set `outdegree[u] = graph[u].length`.
2. Queue every node with `outdegree === 0`.
3. While the queue has nodes left:
   1. Take the next node `v` and mark `safe[v] = true`.
   2. For each `u` in `parents[v]`, decrease `outdegree[u]`. If it reaches 0, queue `u`.
4. Scan from 0 to `n - 1` and collect the safe nodes, which returns them in increasing order.

### Dry run: `graph = [[1],[2],[3],[],[5],[4],[0,4]]`

The out-degrees start as `[1, 1, 1, 0, 1, 1, 2]`. The reversed edges: 0 is pointed at by 6, 1 by 0, 2 by 1, 3 by 2, 4 by 5 and 6, 5 by 4.

| take | out-degree changes | queue after | safe so far |
|---|---|---|---|
| (seed) | | [3] | |
| 3 | node 2: 1 → 0 | [2] | 3 |
| 2 | node 1: 1 → 0 | [1] | 2, 3 |
| 1 | node 0: 1 → 0 | [0] | 1, 2, 3 |
| 0 | node 6: 2 → 1 | [] | 0, 1, 2, 3 |

Node 6 keeps one unconfirmed edge, the one into the 4 ↔ 5 loop, and 4 and 5 never drop to 0. The answer is `[0, 1, 2, 3]`.

### Why it works

A node's out-degree counts its edges that are not yet known to lead to a safe node. It reaches 0 only when every neighbour has been proven safe, and then every walk from the node takes one step to a safe node and ends at a dead end, so the node is safe. A node on a cycle keeps its cycle edge forever, and a node with an edge towards a cycle keeps that edge, so neither is ever queued.

### Edge cases

- **A self-loop** (`graph[i]` contains `i`): that edge is never confirmed, so the node is unsafe.
- **One edge to a dead end and one edge into a cycle:** unsafe. One road that never ends is enough.
- **No edges at all:** every node is terminal, so every node is safe.
- **Output order:** the queue doesn't produce nodes in sorted order, so collect them with a scan from 0 to `n - 1`.

### Common mistakes

- Returning the nodes in the order they were proven safe instead of sorted.
- Calling a node safe because it *can* reach a terminal node. It must be true for **every** walk.
- In the DFS version, resetting a node to white, or marking it black, after a cycle was found through it. It must stay marked unsafe.

### Other ways to solve it

**DFS with three colours.** `isSafe(u)`: a gray node means you have walked into a cycle, so return false; a black node is known safe, so return true. Otherwise colour `u` gray, check every neighbour, and colour it black only if all of them are safe. A node left gray is unsafe. This is O(V + E) too, but the recursion can go `n` levels deep on a long chain.
