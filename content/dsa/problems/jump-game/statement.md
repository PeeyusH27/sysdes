You are given an array of non-negative integers `nums` and start at index `0`. From index `i` you may jump forward to any index from `i + 1` up to `i + nums[i]` (so `nums[i]` is the longest jump allowed from there, and a `0` means you can't move from it).

Return `true` if you can reach the last index, and `false` otherwise.

### Constraints

- `1 <= nums.length <= 10^4`
- `0 <= nums[i] <= 10^5`
