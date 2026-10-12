Given an array of integers `nums`, find its **pivot index**: an index where the sum of all numbers **strictly to its left** equals the sum of all numbers **strictly to its right**. The value at the pivot itself belongs to neither side.

At index `0` the left side is empty (sum `0`); at the last index the right side is empty. If several indices qualify, return the **leftmost** one. If none does, return `-1`.

### Constraints

- `1 <= nums.length <= 10^4`
- `-1000 <= nums[i] <= 1000`
