### Intuition

For an unordered tree you have to search both sides. In a BST the ordering tells you where each target lives *without searching*: a value smaller than the current node is somewhere in its left subtree, a larger one is in its right subtree.

Start at the root. If **both** `p` and `q` are smaller than the current node, they are both on the left, so the lowest common ancestor is also in the left subtree. Same for both larger. The first node where this is no longer true is where the two paths separate (or where one of the values equals the node). That node is the lowest common ancestor.

### Step by step

1. Start with `node = root`.
2. Repeat:
   1. If `p < node.val` and `q < node.val`, move to `node.left`.
   2. Else if `p > node.val` and `q > node.val`, move to `node.right`.
   3. Otherwise return `node.val`.

### Dry run: tree `[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]`, `p = 3`, `q = 5`

| node | p vs node | q vs node | action |
|---|---|---|---|
| 6 | 3 < 6 | 5 < 6 | both smaller: go left |
| 2 | 3 > 2 | 5 > 2 | both larger: go right |
| 4 | 3 < 4 | 5 > 4 | split: return **4** |

### Why it works

At every step the invariant is that both `p` and `q` lie in the subtree of `node`, so `node` is a common ancestor. We only move to a child when both targets are inside that child's subtree, which gives a deeper common ancestor. When we cannot move, the two targets are on different sides (or one of them is `node`), so no child can contain both: `node` is the deepest one.

### Common mistakes

- Using the unordered-tree recursion (searching both children). It works but is O(n) instead of O(h).
- Using `<=` instead of `<` in the first two tests: if `p` equals `node.val`, the node itself is the answer, so you must stop there.
- Assuming `p < q`. The inputs can come in either order, which is why both conditions test both values.

### Other ways to solve it

The same logic as recursion: `if (p < root.val && q < root.val) return f(root.left, p, q)`, and so on. It uses O(h) stack. The loop version uses O(1) extra space.
