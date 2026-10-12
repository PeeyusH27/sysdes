### Intuition

Draw an arrow `b → a` for every pair `[a, b]`: "finishing b unlocks a". Every course can be finished exactly when these arrows contain **no cycle**. On a cycle, each course waits for another course on the same cycle, so none of them can ever go first.

**Kahn's algorithm** finds out by simulating a student. A course is ready when its number of unfinished prerequisites, its **in-degree**, is 0. Take a ready course; every course it unlocks loses one unfinished prerequisite, and any of them that reach 0 become ready. If the student manages to take every course, there is no cycle. If they get stuck with courses left over, those courses are blocked by a cycle.

### Step by step

1. Build `unlocks[pre]`, the list of courses that need `pre`, and `indegree[course]`, from every pair `[course, pre]`.
2. Put every course with `indegree === 0` into a queue.
3. Set `taken = 0`. While the queue has courses left:
   1. Take the next course `c` (advance a head index) and increase `taken`.
   2. For each `next` in `unlocks[c]`, decrease `indegree[next]`. If it reaches 0, queue `next`.
4. Return `taken === numCourses`.

### Dry run: `numCourses = 6`, `prerequisites = [[2,0],[2,1],[3,2],[4,2],[5,3],[5,4]]`

The edges are 0→2, 1→2, 2→3, 2→4, 3→5 and 4→5, so the in-degrees start as `[0, 0, 2, 1, 1, 2]`.

| take | in-degree changes | queue after | taken |
|---|---|---|---|
| (seed) | | [0, 1] | 0 |
| 0 | course 2: 2 → 1 | [1] | 1 |
| 1 | course 2: 1 → 0, ready | [2] | 2 |
| 2 | course 3: 1 → 0, course 4: 1 → 0 | [3, 4] | 3 |
| 3 | course 5: 2 → 1 | [4] | 4 |
| 4 | course 5: 1 → 0, ready | [5] | 5 |
| 5 | | [] | 6 |

All 6 courses were taken, so the answer is `true`.

With `numCourses = 3` and `prerequisites = [[0,1],[1,2],[2,0]]`, every course starts with in-degree 1. The queue starts empty, `taken` stays 0, and the answer is `false`.

### Why a leftover course means a cycle

Suppose course `x` is never taken. Its in-degree never reached 0, so at least one of its prerequisites, `y`, was never taken either. The same is true of `y`, and of its untaken prerequisite, and so on. There are only `numCourses` courses, so this backward chain of untaken courses must eventually repeat a course: that repetition is a cycle. Conversely, the courses on a cycle can never be the first of their cycle to reach in-degree 0, so a cycle always leaves courses behind.

### Edge cases

- **No prerequisites:** every course is queued at the start, so the answer is `true`.
- **A course that requires itself** (`[0, 0]`) is a cycle of length one: its in-degree is 1 and never drops.
- **Repeated pairs** add 2 to the in-degree and appear twice in `unlocks`, so they are also subtracted twice. Still correct.
- **Several separate groups of courses:** a cycle in any one of them makes the answer `false`.

### Common mistakes

- Treating "I reached a course I've already seen" as a cycle in a DFS. Reaching a course that is already **finished** is fine; only reaching one that is still on the current DFS path means a cycle. That's why DFS needs three colours.
- Getting the direction backwards (`a → b`). Here it happens not to matter, because reversing every edge keeps cycles as cycles, but Course Schedule II would return the order backwards.
- Calling `queue.shift()` in the loop, which is O(n) per call. Use a head index.

### Other ways to solve it

**DFS with three colours:** white = not visited, gray = on the current path, black = finished. Start a DFS from every white course; meeting a gray course means a cycle. It is also O(V + E), but the recursion can go `numCourses` levels deep.
