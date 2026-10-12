A **path** in a binary tree is a sequence of nodes in which each pair of neighbours is joined by an edge and no node appears twice. A path may start and end at any nodes: it does not have to pass through the root, and it can climb up to a node and come back down on the other side.

The **path sum** is the total of the values of the nodes on the path. Given the `root` of a **non-empty** binary tree, return the largest path sum over all non-empty paths.

Values can be negative. A single node on its own is a valid path.

### Constraints

- The tree has between `1` and `3 * 10^4` nodes.
- `-1000 <= Node.val <= 1000`
