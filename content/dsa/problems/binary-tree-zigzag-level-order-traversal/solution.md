### Intuition

The levels are exactly the ones a normal level-order traversal produces; only the **reading direction** alternates. So keep the BFS completely standard (always enqueue left child, then right child, so every level comes out left to right) and change only **where you write** each value:

- on a left-to-right level, the i-th node dequeued goes to index `i`;
- on a right-to-left level, it goes to index `size - 1 - i`, filling the array from the back.

A boolean flag flips after every level.

### Step by step

1. Start with `levels = []`, a queue holding the root (or nothing), and `leftToRight = true`.
2. While the queue has nodes left:
   1. `size = queue.length - head`, and `level = new Array(size)`.
   2. For `i` from 0 to `size - 1`: dequeue a node and store its value at `level[i]` if `leftToRight`, otherwise at `level[size - 1 - i]`. Enqueue its left child, then its right child.
   3. Push `level`, then flip `leftToRight`.
3. Return `levels`.

### Dry run: `[1, 2, 3, 4, 5, 6, 7]`

| level | dequeued (always left to right) | direction | written as |
|---|---|---|---|
| 1 | 1 | left to right | [1] |
| 2 | 2, 3 | right to left | 2 goes to index 1, 3 to index 0: [3, 2] |
| 3 | 4, 5, 6, 7 | left to right | [4, 5, 6, 7] |

Result: `[[1], [3, 2], [4, 5, 6, 7]]`.

### Common mistakes

- Swapping the order in which children are **enqueued** on alternate levels. That changes which nodes come out first on the *next* level, and the order gets scrambled from the third level on.
- Flipping the flag inside the inner loop instead of once per level.
- Calling `level.unshift(value)` for right-to-left levels: it works, but each `unshift` moves the whole array, O(size) per value.

### Other ways to solve it

- Build each level left to right as usual and call `level.reverse()` on every other level. Also O(n) overall, and arguably the easiest to read.
- Use two stacks, one per direction, pushing children in opposite orders. It avoids the index arithmetic but is easier to get wrong.
