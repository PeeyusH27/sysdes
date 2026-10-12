### Intuition

From the right side you see **one node per level: the rightmost one**. It is tempting to follow right children down from the root, but that misses levels where the right side has run out: in `[1, 2, 3, 4, 5, null, 6, null, 7]` the deepest level holds only 7, which hangs off the left subtree.

A level-by-level BFS sees each whole level. Using the level-size loop, the nodes of a level come out left to right, so the **last** one dequeued on each level (index `size - 1`) is the visible one.

### Step by step

1. Start with an empty `view` and a queue holding the root (or nothing, for an empty tree).
2. While the queue has nodes left:
   1. `size = queue.length - head`.
   2. Dequeue `size` nodes. When `i === size - 1`, push that node's value onto `view`.
   3. Enqueue each node's left child, then its right child.
3. Return `view`.

### Dry run: `[1, 2, 3, 4, 5, null, 6, null, 7]`

| level | nodes, left to right | last one (visible) |
|---|---|---|
| 1 | 1 | 1 |
| 2 | 2, 3 | 3 |
| 3 | 4, 5, 6 | 6 |
| 4 | 7 | 7 |

Result: `[1, 3, 6, 7]`. Following right pointers only would stop at `[1, 3, 6]`.

### Common mistakes

- Walking `root.right` repeatedly: it misses deeper levels that exist only on the left.
- Taking the first node of each level (that is the left side view).
- Enqueuing right before left and then still taking the last node: the order flips and you get the left view.

### Other ways to solve it

**DFS, right child first**: `visit(node, depth)` checks `if (depth === view.length) view.push(node.val)`, then visits `node.right` before `node.left`. The first node to reach each new depth is the rightmost one on that level. O(n) time, O(h) stack.
