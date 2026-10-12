### Intuition

Sorting the array from largest to smallest and reading index `k - 1` is correct and short, but it puts all `n` values in order when we only care about the top `k`.

Instead, walk the array once and keep a **min-heap of the k largest values seen so far**. The heap's top is the weakest member of that club. Each new value is pushed in; if the club now has `k + 1` members, the weakest one is popped out. After the walk the club is exactly the top `k`, and its weakest member, the top of the heap, is the kth largest value.

Each step is a push and maybe a pop on a heap of size at most `k + 1`, so the whole walk is O(n log k) instead of O(n log n). When `k` is small that is close to linear.

### Step by step

1. Write a binary min-heap with a comparator: `new Heap((a, b) => a - b)`.
2. For each value `x` in `nums`:
   1. Push `x`.
   2. If `heap.size() > k`, pop the smallest value.
3. Return `heap.peek()`.

### Dry run: `nums = [3, 9, 1, 7, 5]`, `k = 2`

The heap column lists values in sorted order for readability.

| x | after push | size > 2? | heap afterwards |
|---|---|---|---|
| 3 | 3 | no | 3 |
| 9 | 3, 9 | no | 3, 9 |
| 1 | 1, 3, 9 | yes, pop 1 | 3, 9 |
| 7 | 3, 7, 9 | yes, pop 3 | 7, 9 |
| 5 | 5, 7, 9 | yes, pop 5 | 7, 9 |

The heap holds the two largest values, 7 and 9. Its top, **7**, is the 2nd largest.

### Why it works

Invariant: after processing some prefix of the array, the heap holds the `k` largest values of that prefix. When `x` arrives, the new top `k` is the old top `k` plus `x`, minus whichever of those `k + 1` values is smallest, and that is exactly what push-then-pop removes. Duplicates are separate heap entries, so `[4, 4, 4]` with `k = 2` keeps two 4s.

### Common mistakes

- `nums.sort()` without a comparator sorts numbers as strings: `[10, 9, 2]` becomes `[10, 2, 9]`. Always pass `(a, b) => a - b` or `(a, b) => b - a`.
- Using a **max**-heap of size `k`: it keeps the k **smallest** values instead.
- De-duplicating with a `Set`: the problem counts duplicates separately.
- Off-by-one when sorting: the kth largest is index `k - 1` in descending order, or `n - k` in ascending order.

### Other ways to solve it

- **Sort**: `[...nums].sort((a, b) => b - a)[k - 1]`. O(n log n), perfectly fine in many interviews as a first answer.
- **Quickselect**: partition around a pivot like quicksort, but recurse only into the side that contains index `n - k` (in ascending order). Average O(n), worst case O(n²) unless the pivot is random. Arrays with many equal values need a three-way partition to stay fast.
- **Counting**: values lie in `[-10^4, 10^4]`, so a count array of size 20001 scanned from the top finds the answer in O(n + range).
