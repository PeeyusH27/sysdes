### Intuition

Every path in a tree has exactly one **highest node**, where it stops climbing and starts going down. If the longest path bends at node X, it goes as deep as possible into X's left subtree and as deep as possible into X's right subtree. Measured in edges, that is

`height(X.left) + height(X.right)`

where `height` counts the nodes on the longest downward path (the edge from X into a subtree plus the edges below it add up to that subtree's height).

The brute force computes this for every node by recomputing heights from scratch: O(n²) on a skewed tree. Instead, compute all heights in **one post-order pass** and evaluate the bend at each node as you go. The helper **returns the height**, because that is what the parent can extend, and it **records** `left + right` in an outer `best`, because a bent path can't be extended upward. That is the "global best" template.

### Step by step

1. Set `best = 0`.
2. Define `height(node)`:
   1. If `node` is `null`, return 0.
   2. Compute `left = height(node.left)` and `right = height(node.right)`.
   3. Update `best = Math.max(best, left + right)`: the longest path that bends here.
   4. Return `1 + Math.max(left, right)`.
3. Call `height(root)` and return `best`.

### Dry run: `[1, 2, null, 3, 4, 5, null, null, 6, 7, null, null, 8]`

The root 1 has only a left child, 2. Below 2 there are two long arms: 2 → 3 → 5 → 7 and 2 → 4 → 6 → 8.

| node | left height | right height | left + right | best | returns |
|---|---|---|---|---|---|
| 7 | 0 | 0 | 0 | 0 | 1 |
| 5 | 1 | 0 | 1 | 1 | 2 |
| 3 | 2 | 0 | 2 | 2 | 3 |
| 8 | 0 | 0 | 0 | 2 | 1 |
| 6 | 0 | 1 | 1 | 2 | 2 |
| 4 | 0 | 2 | 2 | 2 | 3 |
| 2 | 3 | 3 | 6 | **6** | 4 |
| 1 | 4 | 0 | 4 | 6 | 5 |

The answer is 6, from the path that bends at 2. The root's own `left + right` is only 4.

### Why it works

Each path has a single highest node, and the pass tries every node as that highest point, taking the deepest possible arm on each side. So the largest value recorded is the longest path in the tree.

### Common mistakes

- Returning `height(root.left) + height(root.right)` only: that misses paths that don't touch the root, like the one above.
- Counting nodes instead of edges. With heights counted in nodes, `left + right` is already the number of edges.
- Returning `best` (or `left + right`) from the helper: the parent would then extend a path that already bends, which is not a path.
- Calling a separate `height()` function inside a loop over all nodes: correct but O(n²).
