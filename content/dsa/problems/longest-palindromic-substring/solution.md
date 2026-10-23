### Intuition

Testing every substring for "is it a palindrome?" costs O(n³). Turn it around: a palindrome is determined by its **center**. If the characters just outside a palindrome are equal, you get a longer palindrome with the same center. So for each possible center, grow outward until the two sides disagree.

There are `2n - 1` centers: `n` characters (odd-length palindromes) and `n - 1` gaps between neighbours (even-length palindromes). Each expansion costs up to O(n), so the whole thing is O(n²) with O(1) extra memory.

### Step by step

1. Write `expand(left, right)`: while `left >= 0`, `right < n` and `s[left] === s[right]`, move `left` down and `right` up. Return the length of the palindrome, `right - left - 1`.
2. For each index `i`:
   1. `odd = expand(i, i)` and `even = expand(i, i + 1)`.
   2. Let `len` be the larger one. If it beats the best so far, record it and the start index `i - floor((len - 1) / 2)`.
3. Return `s.slice(start, start + bestLen)`.

### Dry run: `"cbbd"`

| center | expansion | length |
|---|---|---|
| `c` (i = 0) | `c` alone | 1 |
| gap c, b | `c` vs `b` differ | 0 |
| `b` (i = 1) | `b`, then `c` vs `b` differ | 1 |
| gap b, b | `b = b` ok, then `c` vs `d` differ | **2** |
| `b` (i = 2) | `b`, then `b` vs `d` differ | 1 |
| gap b, d and `d` | no match / single | 0 and 1 |

The best is `"bb"`, starting at index 1.

### Edge cases

- A single character is its own answer (`bestLen` starts at 1).
- All characters different: any single character is returned.
- The whole string is a palindrome: the middle center expands all the way.

### Common mistakes

- Only trying odd centers, so `"bb"` is never found.
- An off-by-one in the length: after the loop `left` and `right` have each gone one step *too far*, so the length is `right - left - 1`.
- Computing the start index with `i - len / 2` instead of the odd/even-safe `i - floor((len - 1) / 2)`.

### Other ways to solve it

**2D DP table**: `isPal[i][j]` is true when `s[i] === s[j]` and the inside `isPal[i+1][j-1]` is true. O(n²) time and space. **Manacher's algorithm** finds all palindromic radii in O(n), but is rarely expected in interviews.
