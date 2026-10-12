A leaderboard receives scores one at a time, and after every new score it must show the score in **kth place**: the kth largest value among all scores received so far.

Implement the class `KthLargest`:

- `new KthLargest(k, nums)` sets `k` and loads the scores already known, `nums` (possibly empty).
- `add(val)` records the new score `val` and returns the kth largest score among everything stored so far.

Duplicates count separately: in `[8, 8, 3]` the 2nd largest value is `8`. Each call to `add` leaves at least `k` scores stored (counting `val` itself), so the answer always exists.

JavaScript has no built-in priority queue. Write your own small heap inside your solution.

### Constraints

- `1 <= k <= 10^4`
- `0 <= nums.length <= 10^4`
- `-10^4 <= nums[i], val <= 10^4`
- At most `10^4` calls to `add`.
