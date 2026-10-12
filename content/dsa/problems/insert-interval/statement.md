You are given a list of closed intervals `intervals`, sorted by start and **disjoint** (no two of them share a point), and one more closed interval `newInterval = [start, end]`.

Insert `newInterval` into the list, merging it with every interval it overlaps (shares at least one point with), so that the list is still sorted by start and disjoint. Return the resulting list.

You can build and return a new array; you don't have to modify `intervals` in place.

### Constraints

- `0 <= intervals.length <= 10^4`
- `intervals` is sorted by start and its intervals are disjoint.
- `0 <= start <= end <= 10^5` for every interval, including `newInterval`.
