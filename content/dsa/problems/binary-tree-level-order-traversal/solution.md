### Intuition

A queue processes nodes first-in, first-out. If you enqueue a node's left child before its right child, nodes come out of the queue in exactly the order you want: top level first, left to right. What a plain BFS loses is **where one level ends**.

Recover it with the **level-size loop**: at the start of each level, every node in the queue belongs to that level, because their children haven't been added yet. Take `size = queue length` at that moment and dequeue exactly `size` nodes into one array. The children they enqueue meanwhile form the next level.

### Step by step

1. Start with `levels = []` and a queue holding the root (or nothing, for an empty tree). Use a `head` index as the front.
2. While the queue has nodes left:
   1. `size = queue.length - head`.
   2. Create an empty `level` array.
   3. Repeat `size` times: dequeue a node, push its value onto `level`, enqueue its left child and then its right child if they exist.
   4. Push `level` onto `levels`.
3. Return `levels`.

### Dry run: `[1, 2, 3, null, 4, 5, 6, 7]`

| level | queue at start | size | values | enqueued |
|---|---|---|---|---|
| 1 | [1] | 1 | [1] | 2, 3 |
| 2 | [2, 3] | 2 | [2, 3] | 4 (from 2), 5, 6 (from 3) |
| 3 | [4, 5, 6] | 3 | [4, 5, 6] | 7 (from 4) |
| 4 | [7] | 1 | [7] | none |

Result: `[[1], [2, 3], [4, 5, 6], [7]]`.

### Why the size snapshot works

When a level starts, the queue holds exactly that level's nodes, in left-to-right order. Every node added while you process them is a child, one level deeper, and lands behind them. So the first `size` nodes dequeued are the whole level and nothing else, and when they are done the queue holds exactly the next level. That is the invariant.

### Common mistakes

- Looping `for (let i = 0; i < queue.length; i++)`: the length keeps growing as children are added, so all levels merge into one.
- Enqueuing `null` children and then reading `.val` from them.
- Calling `queue.shift()` in a loop on a large tree: each call moves every remaining element, O(n) per dequeue.

### Other ways to solve it

**DFS with the depth passed down**: `visit(node, depth)` pushes `node.val` onto `levels[depth]` (creating it when needed), then visits left before right. Pre-order reaches the nodes of each level from left to right, so the groups come out in the right order. O(n) time, O(h) stack.
