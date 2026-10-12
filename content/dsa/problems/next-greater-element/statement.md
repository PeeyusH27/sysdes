You are given an integer array `nums`. For each position `i`, find its **next greater element**: the first value to the right of index `i` that is **strictly larger** than `nums[i]`.

Return an array `answer` of the same length, where `answer[i]` is that value, or `-1` if nothing to the right of `i` is larger.

### Constraints

- `1 <= nums.length <= 10^5`
- `-10^9 <= nums[i] <= 10^9`
- Aim for O(n) time: scanning to the right from every index is O(n²).
