A window of size `k` slides across the array `nums` from left to right, one position at a time, always covering exactly `k` consecutive elements. Return an array with the **maximum value of every window position**, in order. The result has `nums.length - k + 1` entries.

A solution that rescans each window works but takes `O(n * k)` time. Aim for `O(n)`.

### Constraints

- `1 <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`
- `1 <= k <= nums.length`
