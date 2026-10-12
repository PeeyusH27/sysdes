### Intuition

The brute force checks all O(n²) substrings. Two observations make that unnecessary:

- If a substring has **no repeats**, every shorter substring inside it has none either.
- If a substring **has a repeat**, every longer substring containing it has that repeat too.

So use a **variable window** `s[left..right]` that always holds distinct characters. Move `right` forward one character at a time. If the new character is already inside the window, move `left` forward, removing characters, until the old copy is gone. After that, the window is the longest repeat-free substring that **ends at `right`**, and the answer is the best of those over all `right`.

### Step by step

1. Create an empty `Set` called `inWindow`, and set `left = 0`, `best = 0`.
2. For each `right` from 0 to `s.length - 1`:
   1. While `inWindow` contains `s[right]`, delete `s[left]` from the set and increase `left`.
   2. Add `s[right]` to the set.
   3. Update `best = Math.max(best, right - left + 1)`.
3. Return `best`.

### Dry run: `s = "abcdbefg"`

| right | char | shrink | window | best |
|---|---|---|---|---|
| 0 | a | | a | 1 |
| 1 | b | | ab | 2 |
| 2 | c | | abc | 3 |
| 3 | d | | abcd | 4 |
| 4 | b | b is inside: remove a, remove b (left = 2) | cdb | 4 |
| 5 | e | | cdbe | 4 |
| 6 | f | | cdbef | 5 |
| 7 | g | | cdbefg | **6** |

### Why it's O(n)

`left` and `right` only move forward. Each character is added to the set once (when `right` reaches it) and removed at most once (when `left` passes it). The inner `while` therefore runs at most n times **in total**, not n times per step.

### Edge cases

- The empty string returns 0: the loop never runs.
- `" "` returns 1: a space is a character like any other.
- A string of one repeated character returns 1.

### Common mistakes

- Shrinking with `if` instead of `while`: in `"abcdb"`, removing only `a` leaves the old `b` inside the window.
- Recording the length **before** shrinking, which counts a window that contains a repeat.
- In the "jump" version below, jumping `left` **backwards**: in `"abba"`, the final `a` was last seen at index 0, which is already outside the window. Always take `Math.max(left, last + 1)`.

### Other ways to solve it

- **Last-seen index map**: remember the last index of every character. When `s[right]` was last seen at `last` and `last >= left`, jump `left` straight to `last + 1`. Same O(n), no inner loop.
