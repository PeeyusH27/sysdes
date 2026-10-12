There are `numCourses` courses, numbered from `0` to `numCourses - 1`. Each pair `[a, b]` in `prerequisites` means course `b` must be finished before course `a` can be started.

Return `true` if it is possible to finish every course, and `false` otherwise.

### Constraints

- `1 <= numCourses <= 2000`
- `0 <= prerequisites.length <= 5000`
- `0 <= a, b < numCourses`
- A pair can appear more than once, and `a` can equal `b` (a course that requires itself)
