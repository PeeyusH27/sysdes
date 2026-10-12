### Intuition

With a hash map you could solve the unsorted version in O(n) time and O(n) space. Sorting gives us something better: the sum of the two ends tells us which end is useless.

- If `numbers[left] + numbers[right]` is **too small**, then `numbers[left]` plus *anything* left of `right` is also too small. `numbers[left]` can never be in the answer, so drop it: `left++`.
- If the sum is **too big**, `numbers[right]` plus anything right of `left` is too big too. Drop it: `right--`.

Every step removes one candidate, so after at most `n - 1` steps the pointers have found the pair.

### Step by step

1. Set `left = 0` and `right = numbers.length - 1`.
2. Compute `sum = numbers[left] + numbers[right]`.
3. If `sum === target`, return `[left, right]`.
4. If `sum < target`, increase `left`; otherwise decrease `right`.
5. Repeat from step 2 while `left < right`.

### Dry run: `numbers = [1, 2, 3, 4, 4, 9, 56, 90]`, `target = 8`

| left | right | sum | action |
|---|---|---|---|
| 0 (1) | 7 (90) | 91 | too big → right-- |
| 0 (1) | 6 (56) | 57 | too big → right-- |
| 0 (1) | 5 (9) | 10 | too big → right-- |
| 0 (1) | 4 (4) | 5 | too small → left++ |
| 1 (2) | 4 (4) | 6 | too small → left++ |
| 2 (3) | 4 (4) | 7 | too small → left++ |
| 3 (4) | 4 (4) | 8 | **found [3, 4]** |

### Common mistakes

- Returning 1-based indices out of habit: this problem asks for 0-based.
- Using a nested loop: correct, but O(n²) and it ignores the sorted order.
- Binary-searching the complement for every element works in O(n log n); the two-pointer walk is O(n).
