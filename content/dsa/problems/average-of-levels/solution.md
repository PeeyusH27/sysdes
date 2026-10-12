### Intuition

An average needs two things per level: the sum of its values and how many there are. A breadth-first search hands you the nodes **level by level**, so both are easy to collect, as long as you know where each level ends.

The trick is the **level-size loop**. When a level starts, the queue contains exactly the nodes of that level and nothing else (their children haven't been added yet). Read `size` at that moment, dequeue exactly `size` nodes, and everything those nodes enqueue is the next level.

### Step by step

1. If the tree is empty, the queue starts empty and the result stays `[]`.
2. Put the root in the queue, and keep a `head` index for the front instead of calling `shift()`.
3. While the queue has nodes left (`head < queue.length`):
   1. `size = queue.length - head`: the number of nodes on this level.
   2. Dequeue `size` nodes. Add each value to `sum` and enqueue its non-null children.
   3. Push `sum / size` onto the result.
4. Return the result.

### Dry run: `[4, 7, 9, 10, 2, null, 6]`

| level | queue at start | size | sum | average | enqueued for the next level |
|---|---|---|---|---|---|
| 1 | [4] | 1 | 4 | 4 | 7, 9 |
| 2 | [7, 9] | 2 | 16 | 8 | 10, 2, 6 |
| 3 | [10, 2, 6] | 3 | 18 | 6 | none |

Result: `[4, 8, 6]`.

### Edge cases

- **Empty tree**: return `[]`, not `[0]`.
- **Large values**: sums of 32-bit values stay exact in JavaScript (doubles hold integers exactly up to 2^53), so there is no overflow to worry about here, unlike in Java or C++.

### Common mistakes

- Reading `queue.length` inside the loop condition (`for (let i = 0; i < queue.length; i++)`): the length grows as children are added, so levels run together.
- Using `queue.shift()` on a big tree: each call moves every remaining element, which makes the whole BFS O(n²) in the worst case.
- Dividing by the total number of nodes seen so far instead of the size of the current level.

### Other ways to solve it

**DFS with the depth passed down**: keep `sums[depth]` and `counts[depth]`, visit every node once, then divide. Same O(n) time, O(h) stack instead of a queue.
