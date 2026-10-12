Design a class `NumArray` that answers range-sum questions about a fixed array:

- `new NumArray(nums)` receives the integer array `nums`. The array never changes afterwards.
- `sumRange(left, right)` returns the sum of `nums[left]`, `nums[left + 1]`, …, `nums[right]`. **Both ends are included.**

There can be many `sumRange` calls on the same object, so make each call fast.

Each test is a sequence of calls: the first creates the object (its output is shown as `null`), and every following call is `sumRange` with the given arguments.

### Constraints

- `1 <= nums.length <= 10^4`
- `-10^5 <= nums[i] <= 10^5`
- `0 <= left <= right < nums.length`
- At most `10^4` calls to `sumRange`.
