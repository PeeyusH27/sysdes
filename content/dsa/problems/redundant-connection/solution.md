### Intuition

A tree plus one extra edge contains **exactly one cycle**. Removing any edge on that cycle leaves a tree; removing an edge that is not on the cycle disconnects the graph. So the valid answers are the cycle's edges, and we want the one that comes last in the input.

Now add the edges one by one, in input order, and watch for the first edge whose two ends are **already connected** by the edges added before it:

- Before the cycle's last edge arrives, the edges seen so far contain no cycle, so every one of them joins two separate pieces.
- When the cycle's last edge `[a, b]` arrives, the rest of the cycle already links `a` to `b`. Adding it would close the loop.

Union-find detects exactly that moment: `find(a) === find(b)` means `a` and `b` share a root, so they are already connected. The first edge for which that happens is the answer.

### Step by step

1. Create a union-find of size `n + 1`, because the labels run from `1` to `n` (index 0 is simply unused). `n` equals `edges.length`.
2. For each edge `[a, b]` in input order:
   1. Find the roots of `a` and `b`.
   2. If they are the same, return `[a, b]`: this edge closes the cycle.
   3. Otherwise union the two roots (smaller rank under larger rank).
3. A valid input always returns inside the loop.

### Dry run: `[[1,2], [2,3], [3,4], [1,4], [1,5]]`

| edge | find(a) | find(b) | action | parent[1..5] |
|---|---|---|---|---|
| start | | | | [1, 2, 3, 4, 5] |
| [1, 2] | 1 | 2 | merge: parent[2] = 1 | [1, 1, 3, 4, 5] |
| [2, 3] | 1 | 3 | merge: parent[3] = 1 | [1, 1, 1, 4, 5] |
| [3, 4] | 1 | 4 | merge: parent[4] = 1 | [1, 1, 1, 1, 5] |
| [1, 4] | 1 | 1 | **same root**: 1 and 4 are already linked through 2 and 3 | return [1, 4] |

The edge [1, 5] is never looked at, which is correct: it is not on the cycle, so it could not be removed.

### Why it works

Only one cycle exists, and an edge can only fail the union check if it closes a cycle. Every edge before the cycle's final edge belongs to a forest (no cycle yet), so all of their unions succeed. The cycle's final edge in input order is therefore the first and only edge that fails, and it is exactly the edge the problem asks for.

### Common mistakes

- Returning the last edge of the whole input. The extra edge isn't always last: in `[[1,2], [2,3], [1,3], [3,4], [4,5]]` the answer is `[1, 3]`.
- Sizing the union-find with `n` instead of `n + 1`. Node `n` then has no slot, `find(n)` reads `undefined`, and the roots come out wrong.
- Comparing `parent[a] === parent[b]` instead of the roots. Two nodes can be connected while their direct parents differ.
- Sorting or swapping the pair before returning it. Return the edge as written in the input.

### Other ways to solve it

For each edge in order, run a DFS to see whether `a` can already reach `b` using the edges added so far; the first time it can, return the edge. That is O(n²) time. Union-find does the same check in almost O(1) per edge.
