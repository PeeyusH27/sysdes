### Intuition

This has the same structure as the diameter of a tree, with sums instead of lengths. Every path has one **highest node** X where it bends. The best path that bends at X is

`X.val + (best downward arm into the left subtree) + (best downward arm into the right subtree)`

where a **downward arm** is a path that starts at a child and only goes down. Arms are optional: if the best arm on one side has a negative sum, the path is better off not going there, so count that side as 0.

The best downward path starting at a node is easy to compute bottom-up:

`gain(node) = node.val + max(0, gain(node.left), gain(node.right))`

So one post-order pass does everything. The helper **returns** `gain(node)`, a single straight arm the parent can extend, and **records** the bent path `node.val + left + right` in an outer `best`. A bent path can't be returned upward, because the parent can't attach to a path that already uses both of a node's sides.

### Step by step

1. Set `best = -Infinity`, since every value might be negative.
2. Define `gain(node)`:
   1. If `node` is `null`, return 0.
   2. `left = Math.max(0, gain(node.left))` and `right = Math.max(0, gain(node.right))`: drop negative arms.
   3. Update `best = Math.max(best, node.val + left + right)`.
   4. Return `node.val + Math.max(left, right)`.
3. Call `gain(root)` and return `best`.

### Dry run: `[-3, 4, 5, -1, 6, null, -2]`

The root -3 has children 4 and 5; 4 has children -1 and 6; 5 has only a right child, -2.

| node | left arm | right arm | bend: val + left + right | best | returns |
|---|---|---|---|---|---|
| -1 | 0 | 0 | -1 | -1 | -1 |
| 6 | 0 | 0 | 6 | 6 | 6 |
| 4 | max(0, -1) = 0 | 6 | 10 | 10 | 10 |
| -2 | 0 | 0 | -2 | 10 | -2 |
| 5 | 0 | max(0, -2) = 0 | 5 | 10 | 5 |
| -3 | 10 | 5 | 12 | **12** | 7 |

The answer is 12: 6 → 4 → -3 → 5. It pays the -3 at the root because the arms on both sides are worth more.

### Why it works

Every path has one highest node, and the pass tries every node in that role. For a fixed highest node the two sides are independent, so the best path takes the best optional arm on each side, and those arms are exactly the clamped `gain` values computed below it.

### Edge cases

- **All values negative**: every arm is clamped to 0, so the bend at each node is just its own value, and `best` becomes the largest single value. This is why `best` must start at `-Infinity`, not 0.
- **A single node**: the answer is its value.

### Common mistakes

- Starting `best` at 0: an all-negative tree returns 0, the sum of an empty path, which isn't allowed.
- Returning `node.val + left + right` to the parent: the parent would extend a path that already branches both ways.
- Not clamping negative arms to 0, which forces paths through subtrees that only lower the sum.
- Clamping `node.val` itself: the node is always on the path, even when its value is negative.
