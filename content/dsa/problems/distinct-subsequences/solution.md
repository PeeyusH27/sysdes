### Intuition

Let `dp[i][j]` be the number of ways to form the first `j` characters of `t` from the first `i` characters of `s`. Consider the last character of that prefix of `s`, `s[i-1]`. You always have the choice to **skip** it, which contributes `dp[i-1][j]`. If it equals `t[j-1]` you may also **use** it to match the last needed character, which contributes `dp[i-1][j-1]`.

`dp[i][j] = dp[i-1][j] + (s[i-1] === t[j-1] ? dp[i-1][j-1] : 0)`

Base cases: `dp[i][0] = 1` (an empty target has one way) and `dp[0][j] = 0` for `j > 0` (nothing to pick from). Row `i` only reads row `i - 1`, so a single array updated from right to left is enough.

### Step by step

1. Create `dp` of length `t.length + 1`, all zeros, with `dp[0] = 1`.
2. For each character `c` of `s`:
   1. For `j` from `t.length` down to `1`:
      1. If `c === t[j-1]`, do `dp[j] += dp[j-1]`.
3. Return `dp[t.length]`.

### Dry run: `s = "aab"`, `t = "ab"`

`dp` is indexed by `j = 0, 1, 2`.

| after reading | dp | note |
|---|---|---|
| start | [1, 0, 0] | |
| `a` | [1, 1, 0] | matches t[0] = a: dp[1] += dp[0] |
| `a` | [1, 2, 0] | second a: dp[1] += dp[0] |
| `b` | [1, 2, 2] | matches t[1] = b: dp[2] += dp[1] (2 ways to have "a") |

The answer is `dp[2] = 2`: either `a` can pair with the `b`.

### Edge cases

- `t` empty: the answer is 1, for any `s` including the empty string.
- `s` shorter than `t`, or a letter of `t` missing from `s`: the answer is 0.
- Large counts stay within the 32-bit limit promised by the problem.

### Common mistakes

- Looping `j` from left to right in the one-row version. Then `dp[j - 1]` has already been updated for the current character, so one character of `s` can be used twice.
- Returning a boolean ("is it a subsequence?") instead of the count.
- Starting with `dp[0] = 0`, which makes every count 0.

### Other ways to solve it

**Full 2D table** `(m + 1) x (n + 1)`: clearer to read and to debug, O(m * n) space. **Top-down recursion with memo** on `(i, j)` expresses the same take-or-skip choice directly.
