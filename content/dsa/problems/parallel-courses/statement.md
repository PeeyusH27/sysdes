There are `n` courses, numbered from **`1` to `n`**. Each pair `[before, after]` in `relations` means course `before` must be completed in an earlier semester than course `after`.

In one semester you can take **any number** of courses, as long as every prerequisite of each of them was completed in an earlier semester.

Return the minimum number of semesters needed to complete every course, or `-1` if it can't be done.

### Constraints

- `1 <= n <= 5000`
- `0 <= relations.length <= 5000`
- `1 <= before, after <= n` and `before !== after`
- A pair can appear more than once
