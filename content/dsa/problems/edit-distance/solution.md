### Intuition

Trying sequences of edits blindly is hopeless. Instead, look at the **last letters** of the two words and ask what the last edit could have been.

- If they are **equal**, they need no edit: the answer is the edit distance of the two words without their last letters.
- If they **differ**, the cheapest fix ends with one of three edits, and each leaves a smaller problem:
  - **replace** `word1`'s last letter with `word2`'s → fix both shorter prefixes,
  - **delete** `word1`'s last letter → fix `word1` minus one letter against all of `word2`,
  - **insert** `word2`'s last letter at the end → fix all of `word1` against `word2` minus one letter.

Every subproblem is a pair of prefixes, so there are only `(m + 1) × (n + 1)` of them: a two-string DP table.

### Step by step

1. **State**: `dp[i][j]` = the fewest edits that turn the first `i` letters of `word1` into the first `j` letters of `word2`.
2. **Recurrence**:
   - `word1[i - 1] === word2[j - 1]` → `dp[i][j] = dp[i - 1][j - 1]`.
   - otherwise → `dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])` (replace, delete, insert).
3. **Base cases**: turning `i` letters into the empty string takes `i` deletions, so `dp[i][0] = i`; building `j` letters from nothing takes `j` inserts, so `dp[0][j] = j`.
4. **Order**: row by row, left to right; diagonal, above and left are then ready.
5. **Answer**: `dp[m][n]`.
6. **Space**: each row reads only the previous row, so two rows (or one row plus a saved diagonal value) are enough.

### Dry run: `word1 = "flaw"`, `word2 = "lawn"`

| | ∅ | l | a | w | n |
|---|---|---|---|---|---|
| **∅** | 0 | 1 | 2 | 3 | 4 |
| **f** | 1 | 1 | 2 | 3 | 4 |
| **l** | 2 | 1 | 2 | 3 | 4 |
| **a** | 3 | 2 | 1 | 2 | 3 |
| **w** | 4 | 3 | 2 | 1 | **2** |

- `f` vs `l`: different, `1 + min(0, 1, 1) = 1` (replace f with l).
- `l` vs `l`: equal, copy the diagonal `dp[1][0] = 1` (the 1 is deleting the f).
- `a` vs `a` and `w` vs `w`: equal, copy the diagonal: 1, then 1.
- `w` vs `n` (bottom-right): different, `1 + min(2, 3, 1) = 2`, where the 1 on the left means "`flaw` → `law` costs 1, then insert `n`".

### Why it works

Line the two words up as an alignment: every letter of `word1` is kept, replaced or deleted, and every letter of `word2` is matched or inserted. Look at the last column of an optimal alignment: it is a match, a replace, a delete or an insert, and removing it leaves an optimal alignment of shorter prefixes. The recurrence tries every possibility for that last column, so it finds the minimum.

### Edge cases

- One word empty: the answer is the length of the other (all inserts or all deletes), which is exactly row 0 or column 0.
- Identical words: every diagonal step is a free match, so the answer is 0.
- Reversed words like `"abc"` and `"cba"`: 2 (replace the first and the last letter), not 3 or 4.

### Common mistakes

- Seeding row 0 and column 0 with zeros: turning `"abc"` into `""` would then cost 0.
- Adding 1 on a match too: matching letters are free.
- Mixing up the neighbours is harmless for the **number** (all three are tried), but matters when you rebuild the list of edits: above is delete, left is insert, diagonal is replace.
- Plain recursion without a memo: three branches per call, so it explodes on the 25-letter test.
