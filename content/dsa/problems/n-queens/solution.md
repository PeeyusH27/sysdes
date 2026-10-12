### Intuition

Two queens in the same row attack each other, so a solution has **exactly one queen per row**. That turns the puzzle into a sequence of choices: for row 0, pick a column; for row 1, pick a column; and so on. Backtracking places queens row by row and, as soon as a row has no safe column, undoes the previous choice and tries that row's next column.

Checking whether a square is attacked must be fast. A queen at `(r, c)` controls:

- its **column** `c`,
- its **diagonal** going down-right, where `r - c` is the same on every square,
- its **anti-diagonal** going down-left, where `r + c` is the same on every square.

Keep three sets, `cols`, `diagonals` (of `r - c`) and `antiDiagonals` (of `r + c`). A square is safe exactly when none of the three sets contains its value: an O(1) check.

### Step by step

1. `queens = []` holds the column chosen in each row so far.
2. Define `place(r)`:
   1. If `r === n`, every row has a queen: turn each column `c` in `queens` into the string `".".repeat(c) + "Q" + ".".repeat(n - c - 1)` and record the board.
   2. For each column `c` from `0` to `n - 1`:
      - if `c`, `r - c` or `r + c` is already taken, skip it (prune);
      - choose: push `c` and add `c`, `r - c`, `r + c` to the three sets;
      - explore: `place(r + 1)`;
      - un-choose: pop and delete the three values.
3. Call `place(0)` and return the recorded boards.

### Dry run: `n = 4`, up to the first solution

`queens` lists the column chosen in each row so far.

| row | column tried | check | action | queens |
|---|---|---|---|---|
| 0 | 0 | safe | place | [0] |
| 1 | 0, 1 | column taken; diagonal of (0, 0) | skip | [0] |
| 1 | 2 | safe | place | [0, 2] |
| 2 | 0, 1, 2, 3 | column; anti-diagonal of (1, 2); column; diagonal of (1, 2) | dead end: un-choose row 1 | [0] |
| 1 | 3 | safe | place | [0, 3] |
| 2 | 0 | column taken | skip | [0, 3] |
| 2 | 1 | safe | place | [0, 3, 1] |
| 3 | 0, 1, 2, 3 | column; column; diagonal of (2, 1); column | dead end: un-choose row 2 | [0, 3] |
| 2 | 2, 3 | diagonal of (0, 0); column | dead end: un-choose rows 1 and 0 | [] |
| 0 | 1 | safe | place | [1] |
| 1 | 0, 1, 2 | anti-diagonal; column; diagonal | skip | [1] |
| 1 | 3 | safe | place | [1, 3] |
| 2 | 0 | safe | place | [1, 3, 0] |
| 3 | 0, 1 | column taken | skip | [1, 3, 0] |
| 3 | 2 | safe | place: row 4 = n, record | [1, 3, 0, 2] |

The first board is `[".Q..", "...Q", "Q...", "..Q."]`. The search continues the same way and finds its mirror image, `["..Q.", "Q...", "...Q", ".Q.."]`.

### Why it works

Placing one queen per row covers every arrangement that could possibly be a solution, and the three sets reject a column exactly when an earlier queen attacks it. Because a conflict is detected the moment a queen is placed, whole subtrees of hopeless boards are never visited: that pruning is what makes `n = 8` (92 solutions) instant even though there are 8^8 ways to put one queen in each row.

### Common mistakes

- Checking only one diagonal direction. Both `r - c` and `r + c` are needed.
- Storing `r + c` for both diagonals, or `Math.abs(r - c)`, which merges different diagonals.
- Forgetting to delete from the sets when un-choosing: later branches see phantom queens and miss solutions.
- Building boards in a shared array of row strings and pushing it without copying.
