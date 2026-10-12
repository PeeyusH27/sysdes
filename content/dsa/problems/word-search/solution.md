### Intuition

The word can start at any cell holding its first letter, and from there each next letter must be in one of the 4 neighbouring cells. That is a depth-first search where each step **chooses** a neighbour, **explores** from it, and, if the rest of the word can't be traced, **un-chooses** it and tries another neighbour.

The rule "a cell can't be used twice" means the search must know which cells are on the current path. Instead of a separate visited set, overwrite the cell with a marker such as `"#"` while it is on the path (no letter matches `"#"`), and write the letter back when the search returns. The restore is essential: a cell that was part of a **failed** path must be free for the next attempt.

### Step by step

1. Define `dfs(r, c, i)`: "can `word[i..]` be traced starting at cell `(r, c)`?"
   1. If `(r, c)` is off the board, or `board[r][c] !== word[i]`, return `false`.
   2. If `i` is the last index of `word`, return `true`: every letter matched.
   3. Save the letter and set `board[r][c] = "#"` (choose).
   4. Try the 4 neighbours with `i + 1`, stopping at the first `true`.
   5. Put the letter back (un-choose), whatever the outcome, and return the outcome.
2. Call `dfs(r, c, 0)` for every cell; return `true` as soon as one succeeds.
3. If no start works, return `false`.

### Dry run: `"STARE"` on the first example board

```
S E E D
T A R S
O N E X
```

Neighbours are tried in the order down, up, right, left.

| call | cell | letter vs word[i] | outcome |
|---|---|---|---|
| `dfs(0, 0, 0)` | (0, 0) | S = S | mark, try neighbours |
| `dfs(1, 0, 1)` | (1, 0) | T = T | mark, try neighbours |
| `dfs(2, 0, 2)` | (2, 0) | O ≠ A | false |
| `dfs(0, 0, 2)` | (0, 0) | # ≠ A | false: that cell is on the path |
| `dfs(1, 1, 2)` | (1, 1) | A = A | mark, try neighbours |
| `dfs(2, 1, 3)` | (2, 1) | N ≠ R | false |
| `dfs(0, 1, 3)` | (0, 1) | E ≠ R | false |
| `dfs(1, 2, 3)` | (1, 2) | R = R | mark, try neighbours |
| `dfs(2, 2, 4)` | (2, 2) | E = E, last letter | **true** |

The `true` travels back up; each call restores its cell on the way out, so the board ends unchanged.

### Why it works

Any tracing of the word starts at some cell and moves through neighbours, and `dfs` tries every start and every neighbour, so a valid tracing is never missed. The marker guarantees that no cell is used twice on the current path.

The restore is what keeps the search complete. Without it, a failed attempt leaves cells marked. Take the board

```
B B B B
C C A A
B B B C
```

and the word `"CBBA"`. The search from the C at (1, 0) wanders through the Bs around it and fails, but it leaves some of them marked as `"#"`. The real path, C (1, 1) → B (0, 1) → B (0, 2) → A (1, 2), needs one of those Bs, so a search that forgets to restore returns `false`. With the restore, every start sees the original board.

### Common mistakes

- Not restoring the cell after a failed branch (or deleting from a visited set only on success).
- Returning the result of the first start cell's search instead of trying every start.
- Checking `i === word.length - 1` **before** comparing the letter, which accepts a wrong last letter.
- Allowing diagonal moves: only the 4 orthogonal neighbours count.

### Pruning ideas

- If the word is longer than `m × n`, return `false` immediately.
- Count the letters on the board first; if the word needs more of some letter than the board has, return `false` without searching.
- If the word's last letter is rarer on the board than its first letter, search for the reversed word: fewer starting cells means fewer dead branches.
