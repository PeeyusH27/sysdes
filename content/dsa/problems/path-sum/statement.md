You are given the `root` of a binary tree and an integer `targetSum`. Return `true` if the tree has a **root-to-leaf** path whose values add up to exactly `targetSum`, and `false` otherwise.

A root-to-leaf path starts at the root and ends at a **leaf**, a node with no children. Stopping partway down does not count, even if the sum matches at that point.

Node values and the target can be negative, so the running sum can go down as well as up.

### Constraints

- The tree has between `0` and `5000` nodes.
- `-1000 <= Node.val <= 1000`
- `-1000 <= targetSum <= 1000`
