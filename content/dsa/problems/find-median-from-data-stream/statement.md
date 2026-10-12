The **median** of a list of numbers is its middle value once sorted. With an even count there is no single middle, so the median is the average of the two middle values: the median of `[1, 3, 4, 8]` is `(3 + 4) / 2 = 3.5`.

Implement the class `MedianFinder`, which receives numbers one at a time:

- `new MedianFinder()` creates an empty structure.
- `addNum(num)` adds the integer `num`.
- `findMedian()` returns the median of all numbers added so far. Answers within `10^-5` of the true median are accepted.

`findMedian` is only called after at least one `addNum`. Both methods will be called many times, interleaved, so re-sorting on every call is too slow. JavaScript has no built-in heap: write your own.

### Constraints

- `-10^5 <= num <= 10^5`
- At most `5 * 10^4` calls in total to `addNum` and `findMedian`.
