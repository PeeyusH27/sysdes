### Intuition

Scanning every window for its maximum costs O(k) each time. A heap could track the maximum, but then stale elements that already slid out must be cleaned up lazily and every push costs O(log n).

There is a better observation. When a new value `x` enters the window, any **earlier value that is smaller than or equal to `x`** can never be a window maximum again: `x` is at least as large and will stay in the window longer. So we may delete those values immediately. What remains are the values that could still win, and they are in **decreasing** order from oldest to newest. The maximum of the current window is therefore the oldest remaining value, the front.

Store **indices** in a deque (rather than values) so you can also tell when the front has slid out of the window.

### Step by step

1. Keep a deque of indices into `nums`, and the result list.
2. For each index `i` from left to right:
   1. If the front index is `<= i - k`, it has left the window: drop it from the front.
   2. While the back index holds a value `<= nums[i]`, drop it from the back.
   3. Push `i` at the back.
   4. Once `i >= k - 1` (the first window is full), append `nums[front]` to the result.
3. Return the result.

### Dry run: `[1, 3, 2, 1, 0]`, `k = 3`

| i | value | deque of values after the update | window max |
|---|---|---|---|
| 0 | 1 | 1 | |
| 1 | 3 | 3 (the 1 is smaller, removed) | |
| 2 | 2 | 3, 2 | **3** |
| 3 | 1 | 3, 2, 1 | **3** |
| 4 | 0 | 2, 1, 0 (the 3 at index 1 has expired: 1 <= 4 - 3) | **2** |

The output is `[3, 3, 2]`.

### Why it works

The deque always holds, in order, exactly the window elements that are not dominated by a newer, larger-or-equal element. The largest element of the window can never be dominated (nothing newer is bigger), so it is in the deque; and because the deque is decreasing, it is the front. Each index is pushed once and removed at most once, so the total work is O(n) even though there is a `while` loop inside the `for`.

### Common mistakes

- Popping with `<` instead of `<=`: still correct, but equal values pile up in the deque. Popping when the back is *larger* than the new value breaks the decreasing order and gives wrong answers.
- Storing values, not indices: you then cannot tell when the front has expired, and duplicates make it ambiguous.
- Using `array.shift()` for the front. It is O(n) in the worst case; keep a head pointer instead.
- Emitting a result before the first window is full (`i < k - 1`).

### Other ways to solve it

**Max-heap of `[value, index]`**: pop the top while its index is outside the window, then read the top. O(n log n). **Block decomposition**: split into blocks of size k and precompute prefix and suffix maxima, so each window max is `max(suffix[left], prefix[right])`. O(n) time and O(n) space.
