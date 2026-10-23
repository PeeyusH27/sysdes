You are given the root of a **binary search tree** (every value in a node's left subtree is smaller than the node, every value in its right subtree is larger, and all values are distinct) and two different values `p` and `q` that both exist in the tree.

Return the value of their **lowest common ancestor**: the deepest node that has both `p` and `q` in its subtree. A node counts as part of its own subtree, so if `p` is an ancestor of `q`, the answer is `p`.

Use the BST ordering; you do not need to search the whole tree. Return a number (the node's `val`), not a node.

### Constraints

- The tree has between `2` and `10^5` nodes.
- `-10^9 <= Node.val <= 10^9`, all values distinct.
- `p !== q`, and both values exist in the tree.
