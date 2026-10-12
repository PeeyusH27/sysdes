### Intuition

Build a combination one candidate at a time and track how much of the target is still **remaining**. A branch ends when the remaining amount hits exactly 0 (record it) or can't be reached any more.

Two rules shape the search:

- **No duplicate combinations.** `[3, 3, 5]`, `[3, 5, 3]` and `[5, 3, 3]` are the same combination. Allow candidates only in non-decreasing index order: a call `backtrack(start, remaining)` may pick `candidates[i]` only for `i >= start`.
- **Reuse is allowed.** After picking `candidates[i]`, the next pick may be the same candidate again, so recurse with `start = i`, **not** `i + 1`.

**Pruning.** Sort the candidates first. If `candidates[i]` is already bigger than `remaining`, every candidate after it is bigger too, so `break` out of the loop instead of exploring dead branches.

### Step by step

1. Sort a copy of `candidates` ascending.
2. Define `backtrack(start, remaining)`:
   1. If `remaining === 0`, push a copy of `path` into the result and return.
   2. For each `i` from `start`:
      - if `nums[i] > remaining`, **break** (prune);
      - choose `nums[i]` (push it);
      - explore with `backtrack(i, remaining - nums[i])`;
      - un-choose (pop).
3. Call `backtrack(0, target)`.

### Dry run: `candidates = [3, 4, 5]`, `target = 11`

| path | remaining | what happens |
|---|---|---|
| [] | 11 | try 3, 4, 5 in turn |
| [3] | 8 | try 3, 4, 5 |
| [3, 3] | 5 | try 3, 4, 5 |
| [3, 3, 3] | 2 | 3 > 2: break |
| [3, 3, 4] | 1 | 4 > 1: break |
| [3, 3, 5] | 0 | record **[3, 3, 5]** |
| [3, 4] | 4 | start at 4 (index 1): no more 3s |
| [3, 4, 4] | 0 | record **[3, 4, 4]** |
| [3, 4] | 4 | next candidate 5 > 4: break |
| [3, 5] | 3 | 5 > 3: break |
| [4] | 7 | try 4, 5 |
| [4, 4] | 3 | 4 > 3: break |
| [4, 5] | 2 | 5 > 2: break |
| [5] | 6 | try 5 |
| [5, 5] | 1 | 5 > 1: break |

Result: `[[3, 3, 5], [3, 4, 4]]`.

### Why it works

Every combination, written in sorted order, is reached by exactly one path: pick its smallest candidate as many times as it appears, then the next one, and so on. Starting each loop at `start = i` lets a candidate repeat but never lets an earlier candidate appear after a later one, which is what rules out reordered duplicates. Because all candidates are positive, `remaining` strictly decreases, so the recursion always ends.

### Common mistakes

- Recursing with `i + 1`: each candidate can then be used only once, and `[3, 3, 5]` is never found.
- Recursing with `0`: every ordering of a combination is found, so `[3, 3, 5]` shows up three times.
- `break` without sorting first: a later, smaller candidate gets skipped. Without sorting, use `continue` (or don't prune).
- Pushing `path` instead of a copy.
