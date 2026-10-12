### Intuition

Start with the first piece. It contains `s[0]`, so it must stretch at least to the **last** occurrence of that letter. Every letter inside that stretch drags the end further, to its own last occurrence. Keep stretching until you reach an index where nothing inside the piece appears again later. That's the earliest point where a cut is legal, and cutting there is always right: cutting as early as possible leaves the most string for the remaining pieces.

So precompute the last index of every letter, then sweep once, growing `end` and cutting whenever `i` catches up with it.

### Step by step

1. Record `last[c]`, the last index of each letter `c` (one pass, later positions overwrite earlier ones).
2. Set `start = 0` and `end = 0`.
3. For each index `i`:
   1. `end = Math.max(end, last[s[i]])`.
   2. If `i === end`, close the piece: push `end - start + 1`, then set `start = i + 1`.
4. Return the sizes.

### Dry run: `s = "abacdcde"`

Last positions: `a → 2`, `b → 1`, `c → 5`, `d → 6`, `e → 7`.

| i | letter | last[letter] | end | i === end? | sizes |
|---|---|---|---|---|---|
| 0 | a | 2 | 2 | no | |
| 1 | b | 1 | 2 | no | |
| 2 | a | 2 | 2 | yes: cut "aba" | [3] |
| 3 | c | 5 | 5 | no | |
| 4 | d | 6 | 6 | no | |
| 5 | c | 5 | 6 | no | |
| 6 | d | 6 | 6 | yes: cut "cdcd" | [3, 4] |
| 7 | e | 7 | 7 | yes: cut "e" | [3, 4, 1] |

### Why it works

A cut between two positions is legal exactly when no letter appears on both sides of it. When `i === end`, every letter seen since `start` has its last occurrence at or before `i`, so the cut after `i` is legal; and no earlier cut was legal, because `end` was still ahead. The greedy therefore makes **every** legal cut, which gives the most pieces. (Legal cuts don't interfere with each other, so making all of them at once is fine.)

### Common mistakes

- Cutting when the **current** letter is at its last occurrence (`i === last[s[i]]`) instead of when `i === end`. In `"abacdcde"` that cuts after `"ab"`, but the second `a` comes later.
- Setting `end = last[s[i]]` instead of taking the max, which can move `end` backwards.
- Returning the pieces as strings instead of their lengths.

### Other ways to solve it

Turn each letter into the interval `[first index, last index]`. Two letters must share a piece exactly when their intervals overlap, so merge the overlapping intervals (the Merge Intervals sweep). The merged intervals are the pieces. Same O(n) idea, seen as an interval problem.
