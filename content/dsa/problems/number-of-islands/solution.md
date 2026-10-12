### Intuition

Make every land cell a node, joined to the land cells directly above, below, left and right of it. An island is then a **connected component** of that graph, and counting components is the classic traversal job:

> Scan every cell. When you meet land that no earlier search has visited, you have found a new island: count it, then flood the whole island so none of its cells is counted again.

The flood can be DFS or BFS. All that matters is that every cell of the island gets marked. Here we "sink" visited land by overwriting it with `"0"`, so the grid itself is the visited set, and we use an explicit stack instead of recursion so a huge island can't overflow the call stack.

### Step by step

1. If the grid has no rows, return `0`. Set `islands = 0`.
2. For every cell `(r, c)`, row by row:
   1. Skip it unless `grid[r][c] === "1"`.
   2. Increase `islands`. Set `grid[r][c] = "0"` and push `[r, c]` onto a stack.
   3. While the stack isn't empty, pop `[cr, cc]`. For each of the four directions, if the neighbour is inside the grid and is `"1"`, set it to `"0"` and push it.
3. Return `islands`.

Sinking a cell when it is **pushed** (not when it is popped) means no cell is ever pushed twice.

### Dry run: `["11000", "11010", "00011", "01000"]`

| scan reaches | value there | action | cells sunk by this flood | islands |
|---|---|---|---|---|
| (0,0) | "1" | new island: flood it | (0,0), (1,0), (0,1), (1,1) | 1 |
| (0,1) to (1,2) | "0" | skip: water, or sunk by the first flood | | 1 |
| (1,3) | "1" | new island: flood it | (1,3), (2,3), (2,4) | 2 |
| (1,4) to (3,0) | "0" | skip | | 2 |
| (3,1) | "1" | new island: flood it | (3,1) | 3 |
| (3,2) to (3,4) | "0" | skip | | 3 |

The answer is 3.

### Why it works

A flood started from a land cell reaches exactly the land cells connected to it: its whole island and nothing else. Afterwards no cell of that island is `"1"`, so the scan can only start another flood on a different island. Every island has at least one cell the scan will reach, so each island is counted exactly once.

### Edge cases

- **Empty grid `[]`:** return 0 before reading `grid[0].length`, which would throw.
- **All water** gives 0; **all land** gives 1.
- **Diagonal contact doesn't join cells:** a 4 × 4 checkerboard has 8 islands.
- **A ring of land around a lake**, with land inside the lake, is 2 islands.

### Common mistakes

- Comparing with the number `1` instead of the string `"1"`. Nothing is ever land and the answer is always 0.
- Marking cells when they are popped instead of when they are pushed. Two neighbours can both push the same cell before either pops it, so the stack grows much larger than needed.
- Recursive DFS on a 300 × 300 grid of land can go 90,000 calls deep and overflow the call stack. An explicit stack (or a BFS queue) avoids that.
- Checking bounds after indexing: `grid[-1][c]` throws because `grid[-1]` is `undefined`.

### Other ways to solve it

- **BFS** with a head-index queue counts the same way; only the visiting order changes.
- **Union-find:** union each land cell with its land neighbours, then count the distinct roots. It shines when land is added over time and you need the count after every addition.
- If you may not modify the input, keep a separate `seen` grid of booleans instead of sinking cells.
