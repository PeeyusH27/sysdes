### Intuition

A palindrome mirrors around its centre: the first useful character must match the last, the second must match the second-to-last, and so on. Two pointers walking inward from both ends compare exactly those pairs, and they can skip punctuation on the way without building a cleaned string.

### Step by step

1. Put `left` at index 0 and `right` at the last index.
2. While `left < right`, move `left` forward past any character that is not a letter or digit, and move `right` backward the same way. Keep the `left < right` check inside these loops so they can't cross.
3. Compare `s[left]` and `s[right]` in lowercase. If they differ, return `false` immediately.
4. Otherwise both characters are matched: move `left` one step right and `right` one step left.
5. When the pointers meet or cross, every mirrored pair matched, so return `true`.

### Dry run: `"race a car"`

| left | right | compare | result |
|---|---|---|---|
| 0 `r` | 9 `r` | r = r | move in |
| 1 `a` | 8 `a` | a = a | move in |
| 2 `c` | 7 `c` | c = c | move in |
| 3 `e` | 6 is a space, skip to 5 `a` | e ≠ a | **false** |

### Edge cases

- A string with no letters or digits (like `" "`) is a palindrome: the loop never compares anything.
- Digits count: `"0P"` compares `0` with `p` and fails.
- Underscores and apostrophes are punctuation and are skipped.

### Why not clean the string first?

`s.toLowerCase().replace(/[^a-z0-9]/g, "")` followed by a reverse-and-compare is correct and short, but it builds two new strings: O(n) extra memory. Interviewers often ask for the O(1)-space version, which is exactly the two-pointer walk.
