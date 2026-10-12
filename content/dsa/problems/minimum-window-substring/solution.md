### Intuition

The brute force checks every substring of `s` (O(n²) of them) and tests whether it covers `t`: O(n³) or so. The **shortest valid window** template does it in one pass:

- Extend `right` until the window covers `t`.
- Then shrink from the `left` **while it still covers `t`**, recording the window each time, because every shrink gives a shorter candidate.
- When a shrink uncovers a needed character, go back to extending `right`.

The hard part is knowing in O(1) whether the window covers `t`. Keep `need`, a map from each character of `t` to how many more copies the window needs (it can go negative when the window has surplus copies), and a single number `missing`: how many characters of `t`, counting repeats, the window still lacks. The window covers `t` exactly when `missing === 0`.

### Step by step

1. Build `need` from `t`'s letter counts, and set `missing = t.length`, `left = 0`, `bestLen = Infinity`.
2. For each `right`, with `ch = s[right]`:
   1. If `ch` is in `need`: when `need[ch] > 0`, this copy was needed, so decrease `missing`. Then decrease `need[ch]` (it may go negative: a surplus copy).
   2. While `missing === 0`:
      - If `right - left + 1 < bestLen`, record `bestStart = left` and `bestLen`.
      - Let `out = s[left]`. If it's in `need`, increase `need[out]`; if that makes it positive, the window now lacks a copy, so increase `missing`.
      - Increase `left`.
3. Return `""` if `bestLen` is still `Infinity`, otherwise `s.slice(bestStart, bestStart + bestLen)`.

### Dry run: `s = "XAYBZCAB"`, `t = "ABC"`

`need` starts as A = 1, B = 1, C = 1, so `missing = 3`.

| right | char | need A, B, C | missing | what happens |
|---|---|---|---|---|
| 0 | X | 1, 1, 1 | 3 | not needed |
| 1 | A | 0, 1, 1 | 2 | |
| 2 | Y | 0, 1, 1 | 2 | |
| 3 | B | 0, 0, 1 | 1 | |
| 4 | Z | 0, 0, 1 | 1 | |
| 5 | C | 0, 0, 0 | 0 | record XAYBZC (6); drop X; record AYBZC (5); drop A → missing 1, left = 2 |
| 6 | A | 0, 0, 0 | 0 | YBZCA is not shorter; drop Y; record BZCA (4); drop B → missing 1, left = 4 |
| 7 | B | 0, 0, 0 | 0 | ZCAB is not shorter; drop Z; record **CAB** (3); drop C → missing 1, left = 6 |

Answer: `"CAB"`.

### Why it works

For each `right`, the shrink loop stops at the largest `left` whose window still covers `t`, so the shortest valid window **ending at `right`** is always recorded. The answer ends somewhere, so it is among the recorded windows. `left` never needs to move back: a window that covers `t` keeps covering it when extended to the right, so a smaller `left` could only give a longer window.

Each index enters the window once and leaves at most once, so the whole scan is O(m + n).

### Common mistakes

- Decreasing `missing` for **every** occurrence of a needed character, including surplus copies. Only decrease it when `need[ch]` was still positive.
- Tracking only **which** characters are present: `t = "aa"` needs two copies of `a`.
- Calling `s.slice` every time you record a window: each slice is O(length). Store the start and length, and slice once at the end.
- Using a 26-letter array when the input mixes upper- and lowercase letters. Use a `Map` (or an array of 128 indexed by character code).
