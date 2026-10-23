### Intuition

There are 27 groups to check (9 rows, 9 columns, 9 boxes) and each may hold a digit at most once. "Have I seen this digit in this group?" is the hash-set question, so keep one set per group. A single pass over the 81 cells can then check all three groups for each digit at the same time.

The one piece of arithmetic is turning a cell into its box. Boxes are numbered 0 to 8 in reading order, so cell `(r, c)` is in box `Math.floor(r / 3) * 3 + Math.floor(c / 3)`.

### Step by step

1. Create three arrays of nine empty sets: `rows`, `cols`, `boxes`.
2. For each cell `(r, c)`, skip it if it is `"."`.
3. Compute `b = Math.floor(r / 3) * 3 + Math.floor(c / 3)`.
4. If the digit is already in `rows[r]`, `cols[c]` or `boxes[b]`, return `false`.
5. Otherwise add the digit to all three sets.
6. If the loop finishes, return `true`.

### Dry run: two 5s in the top-left box

Board: a 5 at (0, 0) and a 5 at (2, 2), everything else empty.

| cell | digit | box | row set | column set | box set | result |
|---|---|---|---|---|---|---|
| (0, 0) | 5 | 0 | empty | empty | empty | add to all three |
| (2, 2) | 5 | 0 | empty | empty | has 5 | return false |

No row or column repeats, but the box does, and only the box set catches it.

### Edge cases

- An empty board is valid.
- A completed valid board is valid: the check does not care how many cells are filled.
- The same digit in different groups (different row, column and box) is fine.

### Common mistakes

- Checking only rows and columns, and forgetting the box rule.
- Computing the box with `Math.floor(r / 3) + Math.floor(c / 3)`, which maps different boxes to the same number. The row part must be multiplied by 3.
- Comparing digits as numbers when they are strings. That is fine for sets, but `"."` must be skipped explicitly.

### Other ways to solve it

Encode each fact as one string, such as `"5 in row 0"`, `"5 in col 0"`, `"5 in box 0"`, and put them all in a single set; a repeat shows up as a failed insert. A bitmask per group (`mask & (1 << digit)`) uses 27 small integers instead of 27 sets.
