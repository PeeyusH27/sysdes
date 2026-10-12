You are given an array of integers `nums` and an integer `target`. Find two **different** positions `i` and `j` such that `nums[i] + nums[j] === target`, and return them as an array `[i, j]`.

The array is **not sorted**. Every input has **exactly one** valid pair. A position can't be used twice, although two different positions may hold equal values. You may return the two indices in either order.

### Constraints

- `2 <= nums.length <= 10^4`
- `-10^9 <= nums[i] <= 10^9` and `-10^9 <= target <= 10^9`
- Exactly one valid answer exists.
- Aim for better than O(n²) time.
