You are given two arrays `nums1` and `nums2`, each already sorted in ascending order. Return the **median** of all the numbers in both arrays combined: the middle value when everything is sorted, or the mean of the two middle values when the total count is even.

The result can be a half, such as `2.5`, so return a number, not an integer (in Python use `/`, not `//`). Your solution should run in `O(log(m + n))` time, which rules out merging the two arrays.

### Constraints

- `0 <= nums1.length, nums2.length <= 1000`, and `nums1.length + nums2.length >= 1`
- `-10^6 <= nums1[i], nums2[i] <= 10^6`
- Both arrays are sorted in non-decreasing order.
