### Intuition

Preorder tells you **who the root is**: it is the first value. Inorder tells you **how the rest splits**: once you find the root in the inorder list, everything to its left is the left subtree and everything to its right is the right subtree. Apply the same idea to each side and the tree rebuilds itself.

The key bookkeeping is in preorder. Because preorder lists the root, then the entire left subtree, then the entire right subtree, the roots of the subtrees come out in exactly the order you build them. So you don't need to slice preorder: keep one moving pointer `next`, build the left subtree first (it consumes its share of values), then the right.

### Step by step

1. Make a map `indexOf` from each value to its index in `inorder`, so a root can be located in O(1).
2. Keep `next = 0`, the position in `preorder` of the next root to create.
3. Define `build(lo, hi)` for the inorder range `[lo, hi]`:
   1. If `lo > hi`, return `null` (an empty subtree).
   2. Take `rootVal = preorder[next++]` and find `mid = indexOf.get(rootVal)`.
   3. Create the node, set `left = build(lo, mid - 1)`, then `right = build(mid + 1, hi)`.
   4. Return the node.
4. Return `build(0, n - 1)`.

### Dry run: `preorder = [3, 9, 20, 15, 7]`, `inorder = [9, 3, 15, 20, 7]`

| call `build(lo, hi)` | root taken (`next`) | mid | note |
|---|---|---|---|
| build(0, 4) | 3 (0) | 1 | left range 0..0, right range 2..4 |
| build(0, 0) | 9 (1) | 0 | both children ranges empty |
| build(2, 4) | 20 (2) | 3 | left range 2..2, right range 4..4 |
| build(2, 2) | 15 (3) | 2 | leaf |
| build(4, 4) | 7 (4) | 4 | leaf |

The result is `[3, 9, 20, null, null, 15, 7]`.

### Why it works

For any inorder range, the next unused preorder value is the root of that range's subtree, because preorder visits a subtree's root before everything inside it. The left subtree's nodes are exactly the ones before `mid` in inorder, and they appear contiguously in preorder right after the root, so building left before right consumes them in the right order. Distinct values make `mid` unique.

### Common mistakes

- Building the right subtree before the left: the pointer `next` then hands out left-subtree values to the right side.
- Searching for the root with `indexOf` on the array each time: it works but is O(n²) overall.
- Slicing arrays at every call, which is correct but copies O(n) per node.
- Duplicate values would make the root's position ambiguous; the problem guarantees they do not occur.
