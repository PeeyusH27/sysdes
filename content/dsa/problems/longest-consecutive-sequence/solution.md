### Intuition

Sorting and scanning for runs is easy, but it's O(n log n). To reach O(n) you need to answer "is the value `x` in the array?" in O(1), which is exactly what a `Set` does.

With a set, you could measure a run from any `x` by stepping `x + 1`, `x + 2`, … while they exist. But starting a walk from **every** value is wasteful: in the run `1, 2, 3, 4` you would walk 4 + 3 + 2 + 1 steps. The fix is to start walking **only at the beginning of a run**, which is a value `x` whose predecessor `x - 1` is **not** in the set. Then each run is walked exactly once.

### Step by step

1. Put every number into a `Set` called `values`.
2. Set `best = 0`.
3. For each `x` in the set:
   1. If `values.has(x - 1)`, skip `x`: it sits in the middle of a run that will be measured from its start.
   2. Otherwise `x` starts a run. Set `length = 1` and increase it while `values.has(x + length)`.
   3. Update `best = Math.max(best, length)`.
4. Return `best`.

### Dry run: `[10, 5, 12, 3, 11, 4, 13]`

| x | x - 1 in set? | walk | length | best |
|---|---|---|---|---|
| 10 | 9: no → start | 11 ✓, 12 ✓, 13 ✓, 14 ✗ | 4 | 4 |
| 5 | 4: yes → skip | | | 4 |
| 12 | 11: yes → skip | | | 4 |
| 3 | 2: no → start | 4 ✓, 5 ✓, 6 ✗ | 3 | 4 |
| 11 | 10: yes → skip | | | 4 |
| 4 | 3: yes → skip | | | 4 |
| 13 | 12: yes → skip | | | 4 |

Answer: `4`.

### Why it's O(n)

Each value is checked once in the outer loop (O(1) work when it's skipped). The inner `while` only runs from the start of a run and steps through that run once. Runs don't overlap, so all the inner steps together touch each value at most once. Total: O(n), plus O(n) to build the set.

### Edge cases

- Empty input: the loop never runs, so the answer is `0`.
- Duplicates such as `[2, 3, 1, 2]`: the set removes them, giving `1, 2, 3` and a length of 3.
- Negative numbers and very large gaps need nothing special: only `x - 1` and `x + 1` are ever looked up.

### Common mistakes

- Looping over `nums` instead of the set: with many copies of a run's first value, the same run is re-walked for every copy, which can turn the solution into O(n²).
- Starting a walk from every value without the `x - 1` check: still correct, but O(n²) on a long run.
- Sorting first: correct, but O(n log n), which misses the requirement. If you do sort, skip duplicates (`nums[i] === nums[i - 1]`) without resetting the current run.
