### Intuition

The brute force writes all `2^(2n)` strings of brackets and keeps the balanced ones. Most of them are hopeless early: anything starting with `")"` can never be fixed.

Backtracking builds the string left to right and only makes moves that keep the **prefix valid**:

- you may add `"("` while fewer than `n` have been used (`open < n`);
- you may add `")"` only while there is an unmatched `"("` to close (`close < open`).

With these two rules every prefix can still be completed, so every branch ends at a valid string of length `2n`. Nothing is generated and then thrown away.

### Step by step

1. Define `backtrack(open, close)` with a shared `path` array of characters.
2. If `path.length === 2 * n`, record `path.join("")` and return.
3. If `open < n`: push `"("`, call `backtrack(open + 1, close)`, pop.
4. If `close < open`: push `")"`, call `backtrack(open, close + 1)`, pop.
5. Start with `backtrack(0, 0)`.

### Dry run: `n = 2`

| path | open | close | add "("? | add ")"? | result |
|---|---|---|---|---|---|
| "" | 0 | 0 | yes | no (nothing open) | |
| "(" | 1 | 0 | yes | yes | |
| "((" | 2 | 0 | no (used 2) | yes | |
| "(()" | 2 | 1 | no | yes | |
| "(())" | 2 | 2 | | | record **"(())"** |
| "()" | 1 | 1 | yes | no | |
| "()(" | 2 | 1 | no | yes | |
| "()()" | 2 | 2 | | | record **"()()"** |

### Why it works

A string is balanced exactly when no prefix has more `")"` than `"("` and the totals are equal. The rule `close < open` enforces the first condition at every step, and stopping at length `2n` with `open <= n` forces `open = close = n`. Each balanced string is produced once, because at every position the next character is fixed by the string itself.

### Common mistakes

- Allowing `")"` while `close < n` instead of `close < open`: strings like `")("` slip through.
- Generating everything and filtering with a validity check: correct, but it explores `4^n` strings.
- Forgetting to pop after the first branch, so the `")"` branch starts from the wrong prefix. Passing an immutable string instead (`backtrack(s + "(", …)`) avoids the explicit un-choose: each call gets its own string.
