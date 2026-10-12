### Intuition

The tempting check, "each node is greater than its left child and smaller than its right child", is not enough. In `[5, 4, 6, null, null, 3, 7]` every node passes it, yet 3 sits in the right subtree of 5, where everything must be larger than 5.

Turn the rule around. Each node has an **allowed range** set by its ancestors:

- The root can be anything: `(-Infinity, Infinity)`.
- Everything in a node's **left** subtree must be smaller than the node, so going left replaces the upper bound with `node.val`.
- Everything in its **right** subtree must be larger, so going right replaces the lower bound with `node.val`.

If every node is strictly inside its range, every subtree condition holds. This is the **carry state down** template with two values, `low` and `high`.

### Step by step

1. Define `check(node, low, high)`:
   1. If `node` is `null`, return `true`: an empty subtree breaks nothing.
   2. If `node.val <= low` or `node.val >= high`, return `false`.
   3. Return `check(node.left, low, node.val) && check(node.right, node.val, high)`.
2. Return `check(root, -Infinity, Infinity)`.

### Dry run: `[5, 4, 6, null, null, 3, 7]`

| node | low | high | inside (low, high)? |
|---|---|---|---|
| 5 | -∞ | ∞ | yes |
| 4 | -∞ | 5 | yes |
| 6 | 5 | ∞ | yes |
| 3 | 5 | 6 | **no**: 3 is not greater than 5, return `false` |

### Why it works

For a node, each ancestor adds one constraint: "smaller than me" if the node is in that ancestor's left subtree, "larger than me" if in its right. The tightest of these constraints are exactly the `low` and `high` the recursion carries, because each step down only ever tightens one side. So checking the range checks every ancestor at once, in O(1) per node.

### Edge cases

- **Values at the 32-bit limits.** `[-2147483648, null, 2147483647]` is valid. A sentinel such as `-2147483648` for "no lower bound" would wrongly reject the root. `-Infinity` and `Infinity` can't collide with a real value.
- **Duplicates.** `[2, 2, 2]` is invalid: the comparisons must be strict, so reject with `<=` and `>=`.

### Common mistakes

- Comparing each node only with its direct children.
- Rejecting with `<` and `>` instead of `<=` and `>=`, which accepts equal values.
- Using real numbers as "no bound" sentinels, which breaks on values at the limits.

### Other ways to solve it

**In-order traversal**: visiting a BST left, node, right produces its values in sorted order. Walk in order while remembering the previous value; if any value is not strictly greater than the previous one, the tree is invalid. O(n) time, O(h) space.
