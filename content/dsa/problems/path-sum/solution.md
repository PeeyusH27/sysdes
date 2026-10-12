### Intuition

This is the **carry state down** template. Instead of carrying "the sum so far", carry "what is still needed": once a path includes `root.val`, the rest of it must add up to `targetSum - root.val`. That is the same question, asked about a subtree with a smaller target, so the function can call itself.

The path is complete only at a leaf, so that is the only place to check whether the remaining amount is exactly 0. And because values can be negative, you can't stop early when a partial sum overshoots: a later negative value may bring it back.

### Step by step

1. If `root` is `null`, return `false`: there is no path here.
2. Compute `remaining = targetSum - root.val`.
3. If `root` is a leaf (no left **and** no right child), return `remaining === 0`.
4. Otherwise return `hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining)`. The `||` stops as soon as one side finds a path.

### Dry run: `[3, 9, 6, -2, null, 1, 4, null, 5]`, `targetSum = 12`

| node | target passed in | remaining | leaf? | result |
|---|---|---|---|---|
| 3 | 12 | 9 | no | ask both children |
| 9 | 9 | 0 | no (has child -2) | keep going: 0 here doesn't count |
| -2 | 0 | 2 | no (has child 5) | ask child |
| 5 | 2 | -3 | yes | false |
| 6 | 9 | 3 | no | ask both children |
| 1 | 3 | 2 | yes | false |
| 4 | 3 | -1 | yes | false |

No leaf ends with 0 remaining, so the answer is `false`. The remaining amount did reach 0 at node 9, but 9 is not a leaf.

### Edge cases

- An empty tree returns `false` for every target, including 0: there is no path at all.
- A node with only one child is **not** a leaf. Its missing side must not count as the end of a path.

### Common mistakes

- Using `if (root === null) return targetSum === 0;` as the base case. For `[1, 2]` with target 1, the root's missing right child would report a "path" that ends at 1, which is not a leaf.
- Pruning when the running sum is larger than the target: negative values can bring it back down.
- Checking the sum at every node instead of only at leaves.
