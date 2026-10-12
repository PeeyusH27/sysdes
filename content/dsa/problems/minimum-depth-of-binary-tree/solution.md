### Intuition

The minimum depth is the depth of the **shallowest leaf**. A depth-first search has to explore the whole tree to be sure it found the shallowest one: the deep left side might be all it sees for a long time. A breadth-first search visits nodes in order of depth, all of depth 1, then all of depth 2, and so on. So **the first leaf BFS meets is a shallowest leaf**, and you can return its depth on the spot without looking at the rest of the tree.

### Step by step

1. If `root` is `null`, return 0.
2. Put the root in a queue (an array plus a `head` index) and set `depth = 0`.
3. While the queue is not empty:
   1. Increase `depth`: a new level starts.
   2. `size = queue.length - head`. For each of those `size` nodes:
      - If the node has no left **and** no right child, return `depth`.
      - Otherwise enqueue its non-null children.

### Dry run: `[1, 2, 3, 4, 5, null, 6, 7, 8, 9, 10, null, 11]`

The root 1 has children 2 and 3. 2 has children 4 and 5; 3 has only a right child, 6. All of 4, 5 and 6 have children of their own.

| depth | nodes on this level | leaf found? |
|---|---|---|
| 1 | 1 | no |
| 2 | 2, 3 | no: 3 has a right child, so it is not a leaf |
| 3 | 4, 5, 6 | no |
| 4 | 7, 8, 9, 10, 11 | yes, 7: return **4** |

### Why it works

BFS finishes every node at depth d before it dequeues any node at depth d + 1. When it meets the first leaf at depth d, every shallower node has already been checked and none of them was a leaf, so no leaf is shallower.

### Common mistakes

- Treating a node with one child as a leaf. In `[1, null, 2]` the root has a right child, so the answer is 2, not 1.
- Writing DFS as `1 + Math.min(minDepth(left), minDepth(right))`. A missing child returns 0 and wins the `min`, so a one-child node looks like a leaf. If you use DFS, only take the `min` over children that exist.
- Using `queue.shift()`: correct, but each call is O(n), which hurts on a 10^5-node tree.

### Other ways to solve it

**DFS**: `minDepth(node)` returns 0 for `null`, 1 for a leaf, `1 + minDepth(the only child)` when one child is missing, and `1 + Math.min(left, right)` otherwise. It is O(n) time and O(h) space, but always visits every node.
