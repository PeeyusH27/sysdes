You are given an `n × n` grid where `grid[r][c]` is the elevation of cell `(r, c)`. All elevations are **distinct**, and together they are exactly the numbers `0` to `n² - 1`.

Rain starts falling, and at time `t` the water everywhere is at depth `t`. At time `t` you may swim from a cell to a cell directly above, below, left or right of it if **both** cells have elevation at most `t`. Swimming takes no time: at a given moment you can cross any number of covered cells.

You start on the top-left cell `(0, 0)`. Return the earliest time `t` at which you can reach the bottom-right cell `(n - 1, n - 1)`.

### Constraints

- `1 <= n <= 50`
- `grid` contains every number from `0` to `n² - 1` exactly once.
