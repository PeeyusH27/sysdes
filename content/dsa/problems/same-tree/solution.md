### Intuition

Two trees are the same exactly when their roots hold the same value **and** their left subtrees are the same **and** their right subtrees are the same. That sentence is already a recursive algorithm; only the base cases need care. Walk both trees in lockstep, and at every pair of positions decide:

- Both positions empty: they agree.
- Exactly one empty: the shapes differ, so the trees differ.
- Both present: the values must match, then both child pairs must match.

### Step by step

1. If `p` or `q` is `null`, return `p === q` (true only when both are `null`).
2. If `p.val !== q.val`, return `false`.
3. Return `isSameTree(p.left, q.left) && isSameTree(p.right, q.right)`.

### Dry run: `p = [1, 2, 3]`, `q = [1, 2, 4]`

| call | p | q | result |
|---|---|---|---|
| 1 | 1 | 1 | values equal, check children |
| 2 | 2 | 2 | values equal, children `null/null` match: true |
| 3 | 3 | 4 | values differ: **false** |
| 1 (continued) | | | `true && false` = false |

`&&` short-circuits, so as soon as one pair differs the rest is skipped.

### Edge cases

- Both empty returns `true`; one empty returns `false`.
- Same values in different shapes (`[1, 2]` against `[1, null, 2]`): the left child of one tree is `null` while the other has a node, so step 1 catches it. Comparing only inorder or preorder values would miss this.

### Common mistakes

- Comparing values only (for example flattening both trees to arrays without `null` markers), which ignores structure.
- Reading `p.val` before checking for `null`, which throws on empty trees.
- Returning `true` when only one side is `null`.

### Other ways to solve it

**Iterative**: push pairs `[p, q]` on a stack or queue and compare them one by one. Same O(n) time, and avoids deep recursion on a very tall tree.
