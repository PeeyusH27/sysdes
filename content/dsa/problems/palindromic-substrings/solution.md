### Intuition

Checking all O(n²) substrings, each in O(n), is O(n³). Instead, use the fact that a palindrome is fixed by its center. Starting from a center, every time the two ends still match you have found **one more palindrome** (the current range), and one step further out may give the next. Each palindromic substring has exactly one center, so counting from centers never double counts.

There are `2n - 1` centers: each character, and each gap between two neighbours.

### Step by step

1. Set `count = 0`.
2. Define `expand(left, right)`: while the indices are in range and `s[left] === s[right]`, add 1 to `count`, then move `left` down and `right` up.
3. For each index `i`, call `expand(i, i)` (odd length) and `expand(i, i + 1)` (even length).
4. Return `count`.

### Dry run: `"aaa"`

| center | expansions that succeed | added |
|---|---|---|
| char 0 | `a` | 1 |
| gap 0-1 | `aa` | 1 |
| char 1 | `a`, `aaa` | 2 |
| gap 1-2 | `aa` | 1 |
| char 2 | `a` | 1 |

Total: **6**.

### Edge cases

- A string of all different letters: only the `n` single-character palindromes count.
- A string of one repeated letter of length `n`: every substring is a palindrome, `n * (n + 1) / 2`.

### Common mistakes

- Counting only once per center instead of once per successful expansion.
- Forgetting the even centers, so `"aa"` counts only 2.
- Counting distinct palindromic strings with a set: the problem counts positions.

### Other ways to solve it

**DP table**: `isPal[i][j]` is true when `s[i] === s[j]` and (`j - i < 2` or `isPal[i+1][j-1]`); count the true cells. O(n²) time and space.
