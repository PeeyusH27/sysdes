Given the `root` of a binary tree, return `true` if it is a **valid binary search tree** (BST) and `false` otherwise.

A tree is a valid BST when, at **every** node:

- every value in the node's left subtree is **strictly less** than the node's value,
- every value in its right subtree is **strictly greater** than the node's value,
- and both subtrees are valid BSTs too.

An empty tree is a valid BST. Equal values anywhere in a left or right subtree break the rule.

### Constraints

- The tree has between `0` and `10^4` nodes.
- `-2^31 <= Node.val <= 2^31 - 1`
