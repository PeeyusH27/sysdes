Given an integer array `nums` and an integer `k`, return the **kth largest** value in the array.

This is the kth largest by position in sorted order, not the kth largest *distinct* value: duplicates count separately, so in `[5, 5, 2]` the 2nd largest is `5`.

Sorting the whole array works, but try to do better than O(n log n). JavaScript has no built-in heap, so write your own if you use one.

### Constraints

- `1 <= k <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`
