You are given `points`, a list of distinct `[x, y]` coordinates on a plane. Connecting two points costs their **Manhattan distance**: `|x1 - x2| + |y1 - y2|`.

Choose a set of connections so that **every point can reach every other point** (directly or through other points), and return the **smallest possible total cost** of those connections. There is no need to connect every pair: only enough connections to make one connected network.

### Constraints

- `1 <= points.length <= 1000`
- `-10^6 <= x, y <= 10^6`
- All points are distinct.
