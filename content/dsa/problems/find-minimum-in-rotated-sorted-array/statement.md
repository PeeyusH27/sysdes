An array of **distinct** integers was sorted in ascending order and then **rotated** by some unknown number of positions: the first part was cut off and moved to the end. For example `[0, 1, 2, 4, 5, 6, 7]` rotated by 3 becomes `[4, 5, 6, 7, 0, 1, 2]`. A rotation by 0 (or by a multiple of the length) leaves the array sorted.

Given the rotated array `nums`, return its **smallest element**. Your solution must run in `O(log n)` time.

### Constraints

- `1 <= nums.length <= 5000`
- `-5000 <= nums[i] <= 5000`
- All values are distinct.
