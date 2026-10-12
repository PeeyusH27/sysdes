### Intuition

The depth of a tree depends only on the depths of its two subtrees. The longest path from the root goes through the root and then continues down whichever subtree is deeper, so

`depth(node) = 1 + max(depth(node.left), depth(node.right))`

The recursion stops at an empty subtree, whose depth is 0. This is the **return a value up** template: each call waits for both children to answer, then combines their answers on the way back up (post-order).

### Step by step

1. If `root` is `null`, return `0`: an empty tree has no nodes.
2. Recursively compute the depth of the left subtree and the depth of the right subtree.
3. Return `1 + Math.max(left, right)`: the root itself plus the deeper side.

### Dry run: `[1, 2, 3, 4, 5, null, 6, null, null, 7]`

The root 1 has children 2 and 3; 2 has children 4 and 5; 3 has only a right child, 6; 5 has a left child, 7. Calls finish in post-order:

| call | left answers | right answers | returns |
|---|---|---|---|
| maxDepth(4) | 0 | 0 | 1 |
| maxDepth(7) | 0 | 0 | 1 |
| maxDepth(5) | 1 | 0 | 2 |
| maxDepth(2) | 1 | 2 | 3 |
| maxDepth(6) | 0 | 0 | 1 |
| maxDepth(3) | 0 | 1 | 2 |
| maxDepth(1) | 3 | 2 | **4** |

### Edge cases

- An empty tree returns 0 without touching any node.
- A skewed tree (every node has one child) has depth n, so the recursion is n calls deep. That is fine for 10^4 nodes; for much deeper trees, count levels with a BFS or use an explicit stack.

### Common mistakes

- Returning 1 for `null`: every path gets one level too many.
- Counting edges instead of nodes. Here a single node has depth 1, not 0.
- Reaching for `Math.min`: that answers a different question (minimum depth), and even there a node with one child needs special care.

### Other ways to solve it

- **BFS, counting levels**: process the tree one level at a time with a queue and count the levels. O(n) time, O(w) space where w is the widest level.
- **Iterative DFS**: push `[node, depth]` pairs on a stack and track the largest depth seen. O(n) time, O(h) space.
