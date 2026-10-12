You are given the `root` of a binary tree whose node values are all **distinct**, and two different values `p` and `q` that both appear in the tree.

Return the **value** of their lowest common ancestor: the deepest node that has both `p` and `q` in its subtree. A node counts as part of its own subtree, so if the node holding `p` is an ancestor of the node holding `q`, the answer is `p`.

The tree is a general binary tree, **not** necessarily a binary search tree. Return a number (the ancestor's `val`), not the node itself.

### Constraints

- The tree has between `2` and `10^4` nodes.
- `-10^9 <= Node.val <= 10^9`, and all values are distinct.
- `p !== q`, and both values exist in the tree.
