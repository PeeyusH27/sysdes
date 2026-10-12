You are given an array of non-negative integers `nums` and start at index `0`. From index `i` you may jump forward to any index from `i + 1` up to `i + nums[i]`.

Return the **minimum number of jumps** needed to reach the last index. The tests guarantee that the last index can be reached.

### Constraints

- `1 <= nums.length <= 10^4`
- `0 <= nums[i] <= 1000`
- The last index is always reachable.
