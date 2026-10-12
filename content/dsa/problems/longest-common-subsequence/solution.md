### Intuition

Trying every subsequence of one string and checking it against the other is exponential. Instead, compare the strings **from the end**, one letter at a time:

- If the **last letters are equal**, use that letter: the answer is 1 plus the LCS of the two strings without their last letters.
- If they **differ**, at least one of the two last letters is not in the answer. So the answer is the better of "drop the last letter of `text1`" and "drop the last letter of `text2`".

Each step shortens one or both strings, so every subproblem is "a prefix of `text1` and a prefix of `text2`". There are only `(m + 1) × (n + 1)` such pairs: store each answer in a table instead of recomputing it.

### Step by step

1. **State**: `dp[i][j]` = the LCS length of the first `i` letters of `text1` and the first `j` letters of `text2`. The `i`-th letter is `text1[i - 1]`.
2. **Recurrence**:
   - `text1[i - 1] === text2[j - 1]` → `dp[i][j] = dp[i - 1][j - 1] + 1` (the diagonal).
   - otherwise → `dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])` (above or left).
3. **Base cases**: row 0 and column 0 are the empty prefix, and nothing has a common subsequence with an empty string, so they are all `0`. That's why the table is `(m + 1) × (n + 1)`.
4. **Order**: rows top to bottom, each row left to right. Diagonal, above and left are then always filled.
5. **Answer**: `dp[m][n]`, the bottom-right corner (both full strings).
6. **Space**: each row reads only the previous row, so two rows of length `n + 1` are enough if memory matters.

### Dry run: `text1 = "stone"`, `text2 = "longest"`

| | ∅ | l | o | n | g | e | s | t |
|---|---|---|---|---|---|---|---|---|
| **∅** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **s** | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| **t** | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |
| **o** | 0 | 0 | 1 | 1 | 1 | 1 | 1 | 2 |
| **n** | 0 | 0 | 1 | 2 | 2 | 2 | 2 | 2 |
| **e** | 0 | 0 | 1 | 2 | 2 | 3 | 3 | **3** |

The matches happen on the diagonal steps `o/o`, `n/n` and `e/e` (each is the diagonal plus 1). The `st` in both strings gives the 2 in the `t` row, but `"st"` comes before `"one"` in `stone` and after it in `longest`, so they can't be combined: the answer is 3.

### Why it works

If the last letters match, some longest common subsequence ends with that letter in both strings (any LCS that doesn't can be changed to use it without getting shorter), so pairing them and solving the rest is optimal. If they don't match, the two last letters can't both be the final letter of a common subsequence, so one of them can be removed without losing anything, and the recurrence tries both.

### Edge cases

- An empty string: the table has a single row or column of zeros and the answer is 0.
- No shared letters: every cell takes the `max` branch and stays 0.
- Repeated letters (`"aaaa"` and `"aa"`): the answer is capped by the shorter string; the table handles it with no special case.

### Common mistakes

- Making the table `m × n` and reading `text1[i]` with `dp[i][j]`: the empty-prefix row disappears and the first letters can't match properly.
- `new Array(m + 1).fill(new Array(n + 1).fill(0))`: all rows are the same array, so the numbers bleed between rows.
- On a match, using `Math.max(dp[i - 1][j], dp[i][j - 1]) + 1`: that can count one letter twice. A match always reads the **diagonal**.
- Plain recursion on `(i, j)` without a memo: exponential, and it times out on the 40-letter strings.
