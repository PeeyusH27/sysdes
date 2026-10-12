### Intuition

This is Course Schedule, but now you need the order itself. With an edge `pre → course` for each pair, a valid order is a **topological order**: every edge points from an earlier course to a later one.

Kahn's algorithm produces one as a side effect. A course enters the queue only once its in-degree is 0, that is, after every one of its prerequisites has left the queue. So the order in which courses leave the queue is a valid schedule. If that order ends up shorter than `numCourses`, the missing courses are blocked by a cycle, and the answer is `[]`.

There are usually many valid orders, and any of them is accepted.

### Step by step

1. Build `unlocks[pre]` and `indegree[course]` from every pair `[course, pre]`.
2. Queue every course with in-degree 0.
3. While the queue has courses left:
   1. Take the next course `c` and append it to `order`.
   2. For each `next` in `unlocks[c]`, decrease `indegree[next]`; if it reaches 0, queue `next`.
4. Return `order` if it has `numCourses` entries, otherwise `[]`.

### Dry run: `numCourses = 4`, `prerequisites = [[1,0],[2,0],[3,1],[3,2]]`

The edges are 0→1, 0→2, 1→3 and 2→3, so the in-degrees start as `[0, 1, 1, 2]`.

| take | in-degree changes | queue after | order |
|---|---|---|---|
| (seed) | | [0] | [] |
| 0 | course 1: 1 → 0, course 2: 1 → 0 | [1, 2] | [0] |
| 1 | course 3: 2 → 1 | [2] | [0, 1] |
| 2 | course 3: 1 → 0 | [3] | [0, 1, 2] |
| 3 | | [] | [0, 1, 2, 3] |

The order has all 4 courses, so return `[0, 1, 2, 3]`. `[0, 2, 1, 3]` would be just as correct.

### Why it works

A course is appended only after its in-degree hits 0, which happens only after all of its prerequisites were appended. So for every pair `[course, pre]`, `pre` comes earlier in `order`. Courses on a cycle never reach in-degree 0 (see Course Schedule), so the order is short exactly when a cycle exists.

### Edge cases

- **No prerequisites:** every order is valid; Kahn's returns `[0, 1, …, numCourses - 1]`.
- **Any cycle, even a self-loop like `[0, 0]`:** return `[]`. Every course must be taken, so a cycle in one corner of the graph spoils the whole answer.
- **Repeated pairs** are counted twice and subtracted twice, so they're harmless.

### Common mistakes

- Returning the partial order when there's a cycle instead of `[]`.
- Building the edges backwards (`course → pre`) and running Kahn's: the result lists every course *before* its prerequisites.
- Using DFS postorder on `pre → course` edges without reversing it. A course finishes only after everything it unlocks has finished, so postorder lists courses after the courses that depend on them.

### Other ways to solve it

**DFS with three colours.** Follow the `pre → course` edges; when a course turns black (everything it unlocks is finished), append it to a list. Meeting a gray course means a cycle: return `[]`. At the end, reverse the list. Alternatively, follow the edges the other way (`course → pre`) and the postorder is already a valid order, no reversal needed.
