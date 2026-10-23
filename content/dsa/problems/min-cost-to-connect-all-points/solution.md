### Intuition

We need the cheapest set of edges that links all `n` points. The cheapest connected structure never has a cycle (an edge on a cycle could be removed without disconnecting anything and would save money), so it is a tree with exactly `n - 1` edges: a **minimum spanning tree**.

**Kruskal's algorithm** builds it greedily: look at all possible edges from cheapest to most expensive, and keep an edge whenever it connects two points that are **not yet connected** to each other. Keeping an edge between already-connected points would only create a cycle. The question "are these two points already in the same group?" is exactly what **union-find** answers in nearly constant time.

### Step by step

1. Create one edge `[cost, i, j]` for every pair of points, with `cost` the Manhattan distance.
2. Sort the edges by cost, smallest first.
3. Start with each point in its own group (`parent[i] = i`).
4. For each edge in order:
   1. Find the group roots of its two endpoints.
   2. If they are the same, skip the edge.
   3. Otherwise merge the groups, add the cost to the total, and count the edge.
   4. Stop once `n - 1` edges are chosen.
5. Return the total.

### Dry run: `[[0,0], [2,2], [3,10], [5,2], [7,0]]`

Name the points 0 to 4 in that order.

| edge | cost | same group already? | total |
|---|---|---|---|
| 1 - 3 | 3 | no, merge | 3 |
| 0 - 1 | 4 | no, merge | 7 |
| 3 - 4 | 4 | no, merge | 11 |
| 0 - 3, 0 - 4, 1 - 4 (cost 7 each) | 7 | yes, all in one group: skip | 11 |
| 1 - 2 | 9 | no (point 2 is alone), merge | **20** |

That is the fourth accepted edge (`n - 1 = 4`), so we stop.

### Why it works

At each step, the cheapest edge that joins two different groups is always part of some minimum spanning tree (the *cut property*: for any split of the points into two sides, the cheapest edge crossing the split is safe to take). Kruskal's order guarantees that when an edge is taken it is the cheapest one crossing between its group and the rest.

### Common mistakes

- Adding every edge instead of skipping those whose endpoints are already connected.
- Forgetting that edges `(i, j)` and `(j, i)` are the same: generate only `j > i` pairs.
- Sorting with the default comparator (`edges.sort()`), which compares numbers as strings.
- Using Euclidean distance; the problem says Manhattan.

### Other ways to solve it

**Prim's algorithm** grows a single tree from point 0, repeatedly adding the cheapest edge to a point outside the tree. On this dense graph (every pair is an edge) a simple O(n²) version with a `dist` array needs no edge list and no sorting, and uses O(n) memory.
