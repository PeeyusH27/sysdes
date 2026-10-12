### Intuition

Treat the image as a graph: every pixel is a node, joined to the pixels directly above, below, left and right of it. The pixels to repaint are exactly the **connected region** of the start pixel: everything you can reach from `(sr, sc)` by stepping only onto pixels that have the original colour. Any traversal that visits that region works, and a recursive DFS is the shortest to write.

You get the visited set for free. Once a pixel is repainted it no longer has the original colour, so the search can't enter it again. That trick breaks in exactly one case: when `color` equals the original colour, repainting changes nothing and the search bounces between the same pixels forever. Handle that case first.

### Step by step

1. Read `original = image[sr][sc]`. If `original === color`, return `image` unchanged.
2. Define `fill(r, c)`:
   1. If `(r, c)` is outside the image, return.
   2. If `image[r][c] !== original`, return: the pixel has another colour, or it was already painted.
   3. Set `image[r][c] = color`. This is also the "visited" mark.
   4. Call `fill` on the four neighbours `(r + 1, c)`, `(r - 1, c)`, `(r, c + 1)` and `(r, c - 1)`.
3. Call `fill(sr, sc)` and return `image`.

### Dry run: `image = [[3,3,0],[3,0,1],[3,3,3]]`, start `(0, 0)`, `color = 7`

The original colour is 3. Pixels are painted in this order (the calls go down, up, right, left):

| order | pixel | reached from | neighbours it rejects |
|---|---|---|---|
| 1 | (0,0) | the start | (-1,0) and (0,-1) are outside |
| 2 | (1,0) | (0,0), going down | (1,1) is 0 |
| 3 | (2,0) | (1,0), going down | (3,0) is outside; (1,0) is already 7 |
| 4 | (2,1) | (2,0), going right | (1,1) is 0 |
| 5 | (2,2) | (2,1), going right | (1,2) is 1 |
| 6 | (0,1) | (0,0), going right | (1,1) and (0,2) are 0 |

Result: `[[7,7,0],[7,0,1],[7,7,7]]`. The 1 at `(1,2)` touches painted pixels but has a different colour, so it stays.

### Why it works

A pixel is painted only when a neighbour that is already in the region reaches it and it still has the original colour, so nothing outside the region changes. Every pixel of the region is joined to the start by a chain of same-coloured pixels, and the recursion follows every such chain, so nothing in the region is missed. Each pixel is painted at most once.

### Edge cases

- **New colour equals the old one:** return immediately. The image is already correct.
- **Neighbours that already have the new colour** (`[[1,1,2],[1,2,2],[3,3,3]]` filled with 2 from the top-left): they don't have the original colour, so the fill doesn't spread through them.
- **A single pixel,** or a start pixel whose neighbours all differ: only that pixel changes.

### Common mistakes

- Skipping the `original === color` check. A painted pixel still "matches", the recursion never ends, and you get `RangeError: Maximum call stack size exceeded`.
- Spreading into pixels equal to `color` instead of `original`.
- Including diagonal neighbours.
- Indexing before the bounds check: `image[-1]` is `undefined`, and `undefined[c]` throws a `TypeError`.

### Other ways to solve it

A BFS with a queue, or a DFS with an explicit stack, repaints the same pixels in O(m·n). Prefer them when regions can be huge: a 1000 × 1000 image of one colour would need a million nested calls, far beyond the call stack.
