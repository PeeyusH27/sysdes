You are given a list of meetings in no particular order. `intervals[i] = [start, end]` means meeting `i` begins at time `start` and finishes at time `end`.

Return `true` if a single person could attend **every** meeting, which means no two meetings overlap. A meeting that ends at time `t` does **not** clash with one that starts at time `t`: the person can walk straight from one to the other.

### Constraints

- `0 <= intervals.length <= 10^4`
- `0 <= start < end <= 10^6`
