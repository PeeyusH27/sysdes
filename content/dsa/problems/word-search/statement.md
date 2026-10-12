You are given an `m × n` grid of letters `board` and a string `word`. Return `true` if `word` can be **traced** in the grid, and `false` otherwise.

To trace a word, start at a cell holding its first letter and move one step at a time to a **horizontally or vertically adjacent** cell (no diagonals) that holds the next letter. A single cell may not be used twice in the same word.

Letters are case-sensitive: `"a"` does not match `"A"`. You may change `board` while searching, as long as you return the right answer.

### Constraints

- `1 <= m, n <= 6`
- `1 <= word.length <= 15`
- `board` and `word` contain only English letters.
