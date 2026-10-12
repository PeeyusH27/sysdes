### Intuition

A rearrangement of `s1` has exactly `m = s1.length` characters and exactly the letter counts of `s1`. So the question is: does any piece of `s2` of length `m` have the same letter counts as `s1`?

That is a **fixed-size window** of length `m` sliding over `s2`. Each slide changes the window by two letters: one enters on the right, one leaves on the left. Keep the counts up to date instead of recounting each window.

To compare counts in O(1), keep `diff[c] = (count of c in s1) - (count of c in the window)` and a number `unbalanced`: how many letters currently have `diff[c] !== 0`. The window is a rearrangement of `s1` exactly when `unbalanced === 0`.

### Step by step

1. If `m > s2.length`, return `false`.
2. Fill `diff` with the letter counts of `s1`, and set `unbalanced` to the number of non-zero entries.
3. For each `right` in `s2`:
   1. `s2[right]` enters the window: decrease its `diff`.
   2. If `right >= m`, `s2[right - m]` leaves: increase its `diff`.
   3. Each change updates `unbalanced`: a letter going from 0 to non-zero adds one, a letter landing on 0 removes one.
   4. If `unbalanced === 0`, return `true`.
4. Return `false`.

### Dry run: `s1 = "abc"`, `s2 = "xxbcay"`

`diff` starts as a = 1, b = 1, c = 1, so `unbalanced = 3`.

| right | enters | leaves | window | diff a, b, c, x | unbalanced |
|---|---|---|---|---|---|
| 0 | x | | x | 1, 1, 1, -1 | 4 |
| 1 | x | | xx | 1, 1, 1, -2 | 4 |
| 2 | b | | xxb | 1, 0, 1, -2 | 3 |
| 3 | c | x | xbc | 1, 0, 0, -1 | 2 |
| 4 | a | x | bca | 0, 0, 0, 0 | **0 → true** |

### Edge cases

- `s1` longer than `s2`: no window fits, return `false`.
- `s1` equal to `s2` up to order: the first full window already matches.
- Repeated letters such as `s1 = "aab"`: counts, not just presence, must match, which `diff` handles.

### Common mistakes

- Removing the wrong character when sliding: the one that leaves is `s2[right - m]`.
- Checking for a match before the first window is full. With the `diff` approach this is safe (a partial window can't balance all counts of `s1`), but with two count arrays you must wait until `right >= m - 1`.
- Sorting every window and comparing with sorted `s1`: correct, but O(n · m log m).

### Other ways to solve it

- **Compare two count arrays**: keep 26 counts for `s1` and 26 for the window, and compare all 26 after each slide. O(26 · n), perfectly fine in an interview and simpler to write.
