### Intuition

Copying a tree is easy: copy the node, copy each child. A graph can have **cycles** and several paths to the same node, so naive recursion has two problems: it would loop forever, and it would create two different copies of a node reached by two different routes (which breaks the shape of the graph).

The fix is a dictionary from **original node to its copy**. Before creating a copy, ask the map: if we already made one, reuse it. If not, create it and *immediately* register it, then fill in its neighbours. Registering first is what stops the recursion when it comes around a cycle back to a node that is "in progress".

### Step by step

1. If the starting node is `null`, return `null`.
2. Make an empty `Map` called `copies`.
3. Define `copyOf(original)`:
   1. If `copies` has `original`, return its stored copy.
   2. Create `copy = new Node(original.val)` and store `copies.set(original, copy)`.
   3. For each neighbour `nb` of `original`, push `copyOf(nb)` onto `copy.neighbors`.
   4. Return `copy`.
4. Return `copyOf(start)`.

(The test helper then reads the copy back into an adjacency list and compares it.)

### Dry run: the triangle `[[2, 3], [1, 3], [1, 2]]`

| call | map after | what happens |
|---|---|---|
| copyOf(1) | {1} | create copy of 1, visit neighbours 2 then 3 |
| copyOf(2) | {1, 2} | create copy of 2; neighbour 1 is already mapped: reuse; neighbour 3 next |
| copyOf(3) | {1, 2, 3} | create copy of 3; neighbours 1 and 2 are mapped: reuse both |
| back in 2 | | neighbours of copy 2 = [copy 1, copy 3] |
| back in 1 | | neighbour 3 is already mapped: reuse; copy 1 = [copy 2, copy 3] |

Each node has exactly one copy, and the copies reference each other just as the originals did.

### Edge cases

- Empty graph: nothing to copy, return `null`.
- One node with no neighbours: the loop body never runs.
- Neighbour order must be preserved, because the same loop pushes copies in the original order.
- Large graph on a long chain: recursion depth can reach the number of nodes; BFS with a queue avoids that.

### Common mistakes

- Registering the copy in the map **after** visiting the neighbours: on a cycle the recursion never terminates.
- Checking a "visited" set but creating a new `Node` each time, which produces duplicate copies.
- Leaking original nodes into the copy by pushing `original.neighbors[i]` rather than its copy.

### Other ways to solve it

**BFS**: put the start in a queue and create its copy. Pop a node; for each neighbour, if it has no copy yet, create it and enqueue it; always append the neighbour's copy to the current copy's `neighbors`. Same O(V + E) time and O(V) space, without recursion.
