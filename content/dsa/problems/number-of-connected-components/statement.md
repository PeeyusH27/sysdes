You have `n` nodes labelled `0` to `n - 1` and an array `edges`, where `edges[i] = [a, b]` is an **undirected** edge between nodes `a` and `b`.

A **connected component** is a group of nodes in which every node can reach every other node by following edges, and which no outside node can reach. A node with no edges at all is a component by itself.

Return the number of connected components in the graph.

### Constraints

- `1 <= n <= 2000`
- `0 <= edges.length <= 5000`
- `edges[i].length === 2`, `0 <= a, b < n` and `a !== b`
- No edge appears twice.
