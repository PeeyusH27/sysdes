### Intuition

A straightforward way: record the path from the root to `p` and the path to `q`, then walk both paths together; the last node they share is the answer. That is O(n), but takes two searches and extra arrays.

One post-order pass does it. Let every subtree **report what it found**: nothing (`null`), the node holding `p` or `q`, or, once both are found, their common ancestor. Reports travel up from the bottom, so the **first** node that hears from both its left and right subtree is the deepest node with `p` on one side and `q` on the other: the lowest common ancestor. Above it, only one side reports anything, so that node is passed straight up to the root.

If the current node **is** `p` or `q`, report it immediately without searching below. If the other value is underneath, this node is the answer anyway (a node is its own ancestor). If the other value is elsewhere, some ancestor will receive this report from one side and the other from its other side.

### Step by step

1. Define `find(node)`:
   1. If `node` is `null`, return `null`.
   2. If `node.val` is `p` or `q`, return `node`.
   3. Compute `left = find(node.left)` and `right = find(node.right)`.
   4. If both are non-null, return `node`: the targets are on different sides.
   5. Otherwise return whichever is non-null, or `null` if both are.
2. Return `find(root).val`.

### Dry run: `[10, 4, 7, 1, 9, 3, 12, null, null, 6, 2, null, 11]`, `p = 6`, `q = 2`

| node | left reports | right reports | returns |
|---|---|---|---|
| 1 | null | null | null |
| 6 | (is p, no search) | | 6 |
| 2 | (is q, no search) | | 2 |
| 9 | 6 | 2 | **9**: both sides found something |
| 4 | null | 9 | 9 |
| 3, 11, 12, 7 | | | null (neither value is there) |
| 10 | 9 | null | 9 |

The answer is 9.

### Why the early return is safe

When `find` stops at the node holding `p`, the only thing it skips is `p`'s subtree. If `q` is in there, `p` is the answer and it is already being reported. If `q` is not, nothing in that subtree matters. Values are distinct and both exist, so the report that reaches the root is always the LCA.

### Common mistakes

- Returning the node instead of its value: these tests expect a number.
- Treating the tree as a BST and steering left or right by comparing values. Here the values are in no particular order.
- Assuming the answer can't be `p` or `q` itself.
- Returning `true`/`false` ("found it") instead of the node: you then know a target is below, but not which node is the ancestor.

### Other ways to solve it

**Parent map**: traverse once to record each node's parent, put every ancestor of `p` (including `p`) in a set, then walk up from `q` until you hit a node in the set. O(n) time and O(n) space, and it answers many queries quickly once the map exists.
