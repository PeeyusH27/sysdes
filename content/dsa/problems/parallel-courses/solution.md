### Intuition

Each semester, take **every** course that is available. Holding a course back can never help: taking it earlier only unlocks the courses after it earlier. So semester 1 is every course with no prerequisites, semester 2 is every course whose prerequisites were all in semester 1, and so on.

That is Kahn's algorithm processed **one level at a time**, and the number of levels is the answer. Another way to see it: the answer is the number of courses on the **longest chain of prerequisites**. Each course on that chain needs a later semester than the one before it, and the level-by-level schedule never needs more.

Courses that never become available are blocked by a cycle: return -1.

### Step by step

1. Build `unlocks` and `indegree` as arrays of size `n + 1`, because the courses are numbered 1 to `n` (index 0 is unused).
2. Let `current` be every course with in-degree 0. Set `semesters = 0` and `taken = 0`.
3. While `current` isn't empty:
   1. Increase `semesters` and add `current.length` to `taken`.
   2. For each course in `current` and each `next` it unlocks, decrease `indegree[next]`. If it reaches 0, add `next` to `upcoming`.
   3. Set `current = upcoming`.
4. Return `semesters` if `taken === n`, otherwise -1.

### Dry run: `n = 8`, `relations = [[1,2],[2,3],[1,4],[4,5],[5,6],[6,3],[7,8]]`

Course 3 needs both 2 and 6, so its in-degree starts at 2. Courses 1 and 7 start at 0.

| semester | courses taken | what becomes ready for next semester | taken so far |
|---|---|---|---|
| 1 | 1, 7 | 2, 4, 8 | 2 |
| 2 | 2, 4, 8 | 5 (course 3 drops to 1: it still waits for 6) | 5 |
| 3 | 5 | 6 | 6 |
| 4 | 6 | 3 | 7 |
| 5 | 3 | nothing | 8 |

All 8 courses were taken, so the answer is 5: the longest chain is 1 → 4 → 5 → 6 → 3. Course 3 comes right after 2, but it has to wait for the longer chain through 6.

### Why it works

A course becomes ready in the semester right after its **last** prerequisite is taken. By induction, the semester in which a course is taken equals the number of courses on the longest prerequisite chain ending at it. So the number of levels is the length of the longest chain, and no schedule can do better, because each course on that chain must be in a later semester than the previous one.

### Edge cases

- **No relations:** everything fits in semester 1.
- **A cycle anywhere:** the courses on it are never taken, so return -1 even if the rest of the graph is fine.
- **Labels in any order** (course 10 before course 9, and so on): nothing assumes smaller numbers come first.
- **Repeated relations** add to the in-degree twice and subtract twice, so they're harmless.

### Common mistakes

- Sizing the arrays `n` with 1-based labels. `unlocks[n]` is `undefined`, so pushing to it throws, and `indegree[n]++` turns `undefined` into `NaN`, so course `n` is never treated as ready.
- Using a single queue without tracking where each level ends, which loses the semester count. A head-index queue with a `levelEnd` marker, as in BFS, works too.
- Counting edges on the longest chain instead of courses: the answer would be one too small.
- Forgetting the cycle check and returning the number of levels processed.
