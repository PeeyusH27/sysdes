A **tree** is an undirected graph that is connected and has no cycles. You start with a tree on `n` nodes labelled `1` to `n`. Then one extra edge is added between two different nodes that were not already directly joined.

The resulting graph is given as `edges`, an array of `n` edges where `edges[i] = [a, b]` is an undirected edge between `a` and `b`.

Return an edge that can be removed so that the remaining `n - 1` edges form a tree on all `n` nodes. If more than one edge would work, return the one that appears **last** in `edges`. Return it exactly as it is written in the input.

### Constraints

- `3 <= n <= 1000`, and `edges.length === n`
- `1 <= a, b <= n` and `a !== b`
- No edge appears twice, and the graph is connected.
