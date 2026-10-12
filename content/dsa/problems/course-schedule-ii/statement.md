There are `numCourses` courses, numbered from `0` to `numCourses - 1`. Each pair `[a, b]` in `prerequisites` means course `b` must be finished before course `a` can be started.

Return an array containing every course exactly once, in an order in which they can all be taken: each course must appear after all of its prerequisites. If several orders work, return **any** of them. If it is impossible to finish every course, return an empty array `[]`.

### Constraints

- `1 <= numCourses <= 2000`
- `0 <= prerequisites.length <= 5000`
- `0 <= a, b < numCourses`
- A pair can appear more than once, and `a` can equal `b`
