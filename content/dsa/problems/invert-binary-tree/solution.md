### Intuition

Describe the mirror image recursively: it has the same root, the **mirror of the right subtree** on its left, and the **mirror of the left subtree** on its right. So inverting a tree is "invert both subtrees, then swap them". Every node's children get swapped exactly once, which is all a mirror is.

The order doesn't matter much here: swapping before recursing (pre-order) or after (post-order) both work, as long as every node is swapped once.

### Step by step

1. If `root` is `null`, return `null`: the mirror of an empty tree is empty.
2. Invert the right subtree and the left subtree recursively.
3. Put the inverted right subtree on `root.left` and the inverted left subtree on `root.right`. A destructuring assignment evaluates both calls before assigning, so nothing is overwritten too early.
4. Return `root`.

### Dry run: `[5, 3, 8, 1, 4, 7, 9]`

| call | children before | children after |
|---|---|---|
| invert(1), invert(4) | leaves | leaves (nothing to swap) |
| invert(3) | left 1, right 4 | left 4, right 1 |
| invert(7), invert(9) | leaves | leaves |
| invert(8) | left 7, right 9 | left 9, right 7 |
| invert(5) | left 3, right 8 | left 8, right 3 |

Reading the result level by level gives `[5, 8, 3, 9, 7, 4, 1]`: each row of the original, reversed.

### Common mistakes

- Swapping with two plain assignments: `root.left = invertTree(root.right); root.right = invertTree(root.left);`. The second line reads `root.left` after it was overwritten, so the original left subtree is lost and the right one appears twice.
- Forgetting `return root`: the function returns `undefined` and the tests see an empty tree.
- Swapping only the root's two children and not recursing: the deeper levels stay unmirrored.

### Other ways to solve it

- **BFS**: put the root in a queue; for each node you take out, swap its children and enqueue them. O(n) time, O(w) space for the widest level.
- **Explicit stack**: the same swap-and-push loop with a stack instead of a queue.
