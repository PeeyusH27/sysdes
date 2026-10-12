### Intuition

A province is a **connected component** of the road graph. Counting components is what union-find does best:

- Start by pretending every city is its own province: `n` groups.
- Each road between two cities that are in **different** groups merges those groups, so the count drops by exactly one.
- A road between two cities that are **already** in the same group (directly or through other roads) changes nothing.

Union-find answers "are these two cities already in the same group?" by comparing their **roots**. Path compression and union by rank keep each check almost O(1), so the count you are left with after reading every road is the answer.

### Step by step

1. Build a union-find over the `n` cities: `parent[i] = i` (every city is its own root), `rank[i] = 0`, and `count = n`.
2. For every pair `i < j` with `isConnected[i][j] === 1` (the matrix is symmetric, so the upper triangle is enough):
   1. Find the root of `i` and the root of `j`, pointing every visited node straight at its root on the way (path compression).
   2. If the roots are equal, the two cities are already in one province: skip.
   3. Otherwise hang the root with the smaller rank under the other one (bump the rank on a tie) and decrease `count`.
3. Return `count`.

### Dry run: `[[1,1,1,0], [1,1,1,0], [1,1,1,0], [0,0,0,1]]`

Cities 0, 1 and 2 are all linked to each other; city 3 is alone. The upper triangle has three roads: (0, 1), (0, 2) and (1, 2).

| road | find(i) | find(j) | action | parent | count |
|---|---|---|---|---|---|
| start | | | | [0, 1, 2, 3] | 4 |
| (0, 1) | 0 | 1 | different roots: parent[1] = 0, rank[0] = 1 | [0, 0, 2, 3] | 3 |
| (0, 2) | 0 | 2 | rank 1 beats rank 0: parent[2] = 0 | [0, 0, 0, 3] | 2 |
| (1, 2) | 0 | 0 | **same root**: already one province, skip | [0, 0, 0, 3] | 2 |

Answer: **2** provinces, {0, 1, 2} and {3}.

### Why it works

Every successful union joins two different provinces into one, so after all roads `count = n - (successful unions)`, which is exactly the number of groups left. A failed union means the road connects two cities that could already reach each other, so it must not change the count.

### Common mistakes

- Counting roads, or rows that contain a 1, instead of groups: roads chain, so 0-1 and 1-2 put all three cities in **one** province.
- Decrementing `count` for every 1 in the matrix, including the diagonal and roads inside an existing group. Only decrement when `union` actually merged two different roots.
- Comparing `parent[i] === parent[j]` instead of `find(i) === find(j)`. A parent is not necessarily the root; only roots identify a group.

### Other ways to solve it

Run a DFS or BFS from every city that hasn't been visited yet and count how many searches you start: O(n²) time (the matrix is read once) and O(n) space. Both are fine here. Union-find is the better tool when roads arrive one at a time and you need the count after each one.
