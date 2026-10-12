You are planning a hike across a map given as a `rows × cols` grid `heights`, where `heights[r][c]` is the height of cell `(r, c)`. You start at the top-left cell `(0, 0)` and want to reach the bottom-right cell `(rows - 1, cols - 1)`. From any cell you may move up, down, left or right.

The **effort** of a route is the largest absolute height difference between two consecutive cells on it. A long route with gentle steps can beat a short route with one steep step.

Return the minimum effort of any route from the start to the finish.

### Constraints

- `1 <= rows, cols <= 100`
- `1 <= heights[r][c] <= 10^6`
