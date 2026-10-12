### Intuition

Adding up `nums[left..right]` inside `sumRange` is correct, but each call costs O(n), and there can be thousands of calls on the same array. Since the array never changes, do the work **once**, in the constructor.

Store running totals: `prefix[i]` is the sum of the first `i` values. Then any range is the difference of two totals:

`sum(nums[left..right]) = prefix[right + 1] - prefix[left]`

"Everything up to and including `right`" minus "everything before `left`" leaves exactly the range.

### Step by step

1. In the constructor, create `prefix` with `nums.length + 1` entries, all `0`.
2. For each `i`, set `prefix[i + 1] = prefix[i] + nums[i]`.
3. Save it on the object (`this.prefix`) so `sumRange` can read it.
4. In `sumRange(left, right)`, return `this.prefix[right + 1] - this.prefix[left]`.

### Dry run: `nums = [3, -1, 4, 1, -5, 9]`

Building `prefix`:

| i | nums[i] | prefix[i + 1] |
|---|---|---|
| | | prefix[0] = 0 |
| 0 | 3 | 3 |
| 1 | -1 | 2 |
| 2 | 4 | 6 |
| 3 | 1 | 7 |
| 4 | -5 | 2 |
| 5 | 9 | 11 |

So `prefix = [0, 3, 2, 6, 7, 2, 11]`. Queries:

| call | formula | result |
|---|---|---|
| sumRange(0, 2) | prefix[3] - prefix[0] = 6 - 0 | 6 |
| sumRange(2, 5) | prefix[6] - prefix[2] = 11 - 2 | 9 |
| sumRange(0, 5) | prefix[6] - prefix[0] = 11 - 0 | 11 |

### Why the extra leading 0

With `prefix[0] = 0`, a range that starts at index 0 needs no special case: `prefix[right + 1] - prefix[0]`. If instead `prefix[i]` included `nums[i]`, the formula would be `prefix[right] - prefix[left - 1]`, and `left = 0` would read `prefix[-1]`, which is `undefined` in JavaScript, turning the answer into `NaN`.

### Common mistakes

- Off-by-one between the two indexing styles: pick "prefix has n + 1 entries" and use `right + 1` and `left` consistently.
- Building `prefix` in a local variable inside the constructor and then trying to read it in `sumRange`. Store it on `this`.
- Summing the range with a loop inside `sumRange`: passes small tests, but costs O(n) per query.

### Other ways to solve it

- If the array could **change** between queries (an `update(i, val)` method), one update would force rebuilding the prefix array in O(n). A **Fenwick tree** or **segment tree** makes both updates and range sums O(log n).
