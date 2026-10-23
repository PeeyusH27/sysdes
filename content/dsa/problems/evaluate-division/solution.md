### Intuition

Treat each variable as a node. The fact `a / b = k` is a connection between `a` and `b`: going from `a` to `b` multiplies by `k`, and going from `b` back to `a` multiplies by `1 / k`. A query `c / d` asks for the product of the weights along a path from `c` to `d`. If the facts are consistent, **every path gives the same product**, so any path will do and we can use a plain DFS or BFS. No path (or an unknown variable) means the answer is `-1`.

### Step by step

1. Build an adjacency map. For each equation `[a, b]` with value `k`, add `b` with weight `k` to the list of `a`, and `a` with weight `1 / k` to the list of `b`.
2. For each query `[c, d]`:
   1. If `c` or `d` is not in the map, the answer is `-1` (this also covers `x / x` for an unknown `x`).
   2. Otherwise search from `c` with a running product that starts at `1`. Keep a `seen` set so you never revisit a node.
   3. When you pop the node `d`, the running product is the answer. For `c === d` this happens immediately and gives `1`.
   4. If the search ends without reaching `d`, the answer is `-1`.
3. Collect the answers in the order of the queries.

### Dry run: equations `a/b = 2`, `b/c = 3`; query `a / c`

Graph: `a -> b (2)`, `b -> a (0.5)`, `b -> c (3)`, `c -> b (1/3)`.

| step | node | product | action |
|---|---|---|---|
| 1 | a | 1 | push neighbour b with product 1 * 2 = 2 |
| 2 | b | 2 | neighbour a already seen; push c with 2 * 3 = 6 |
| 3 | c | 6 | this is the goal: answer **6** |

### Edge cases

- A variable that is only in the queries is unknown, so any query involving it is `-1`, even `x / x`.
- Variables in different groups of equations are never linked: `-1`.
- A repeated variable in a query with a known variable gives `1`, found immediately since `start === goal`.

### Common mistakes

- Adding only one direction of each edge, so `b / a` fails.
- Returning `1` for `x / x` before checking that `x` appears somewhere.
- Forgetting a `seen` set: the two-way edges make the graph full of cycles.
- Using integer division for `1 / k`.

### Other ways to solve it

**Union-find with weights**: store, for each variable, its ratio to its group root, and compress paths while multiplying ratios. Each query then costs nearly O(1). **Floyd-Warshall** on ratios computes all pairs in O(V³), which is fine here because there are at most about 40 variables.
