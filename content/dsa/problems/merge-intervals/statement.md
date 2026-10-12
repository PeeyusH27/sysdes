You are given an array of closed intervals in any order, where `intervals[i] = [start, end]` covers every point from `start` to `end`, both included. Two intervals **overlap** if they share at least one point: `[1, 3]` and `[3, 5]` overlap, `[1, 2]` and `[3, 4]` do not.

Merge every group of overlapping intervals into one interval covering exactly the same points, and return the resulting list of non-overlapping intervals. You may return them in any order.

### Constraints

- `1 <= intervals.length <= 10^4`
- `0 <= start <= end <= 10^4`
