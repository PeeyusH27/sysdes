A directed graph has `n` nodes numbered from `0` to `n - 1`. It is given as an adjacency list: `graph[i]` lists every node that node `i` has an edge to.

A node is **terminal** if it has no outgoing edges. A node is **safe** if every possible walk starting from it, whichever edges it follows, ends at a terminal node. Terminal nodes are safe. A node from which you could keep walking forever is not.

Return every safe node, sorted in **increasing order**.

### Constraints

- `1 <= n <= 10^4`
- `graph[i]` is sorted in strictly increasing order (no repeated edges) and may contain `i` itself (a self-loop)
- The total number of edges is at most `4 * 10^4`
