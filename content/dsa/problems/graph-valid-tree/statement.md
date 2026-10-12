You are given `n` nodes labelled `0` to `n - 1` and a list of **undirected** edges, where `edges[i] = [a, b]` joins nodes `a` and `b`.

Return `true` if these edges form a valid **tree**, and `false` otherwise. A valid tree must be:

- **connected**: every node can reach every other node, and
- **acyclic**: there is no way to leave a node and come back to it without reusing an edge.

A single node with no edges is a valid tree.

### Constraints

- `1 <= n <= 2000`
- `0 <= edges.length <= 5000`
- `0 <= a, b < n` and `a !== b`
- No edge appears twice.
