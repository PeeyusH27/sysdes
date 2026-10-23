### Intuition

The simple solution copies each element to its new index `(i + k) % n` in a second array: O(n) time, O(n) space. To work in place, notice what rotation does to the two blocks of the array. Rotating right by `k` takes the **last `k` elements** (block B) and puts them **in front** of the first `n - k` elements (block A): `A B` becomes `B A`.

Reversing a whole array turns `A B` into `reverse(B) reverse(A)`. Both blocks are now in the right place but each one is backwards. Reverse each block on its own and you get `B A`. Three reversals, each done with two pointers swapping toward the middle, use no extra memory.

### Step by step

1. Let `n = nums.length` and set `k = k % n`. If `k` is 0, the loop below is harmless, but you could return early.
2. Reverse the whole array: swap `nums[left]` and `nums[right]` while `left < right`, moving both inward.
3. Reverse the first `k` elements (indices `0` to `k - 1`).
4. Reverse the remaining elements (indices `k` to `n - 1`).

### Dry run: `[1, 2, 3, 4, 5, 6, 7]`, `k = 3`

| step | array |
|---|---|
| start | 1 2 3 4 5 6 7 |
| reverse all | 7 6 5 4 3 2 1 |
| reverse first 3 | **5 6 7** 4 3 2 1 |
| reverse last 4 | 5 6 7 **1 2 3 4** |

### Edge cases

- `k > n`: reduce with `k % n` first. Without it, `reverse(0, k - 1)` runs past the end of the array.
- `k % n === 0`: the array must be unchanged. The three reversals still produce the original order, but be sure the second reversal `reverse(0, -1)` is a no-op (it is, because `left < right` is false).
- A single element: `n = 1`, so `k % 1 = 0` and nothing moves.

### Common mistakes

- Rotating left instead of right by reversing the wrong block sizes (the first block has `k` elements, not `n - k`).
- Forgetting `k %= n`, or writing `nums = rotated`, which only changes the local variable.
- Using `nums.splice(...)` / `unshift` in a loop: it works but is O(n·k).

### Other ways to solve it

**Extra array**: write `result[(i + k) % n] = nums[i]` then copy back. O(n) time and space, easiest to get right. **Cycle replacement**: move each element directly to its destination, following the cycle of indices that `i -> (i + k) % n` creates; there are `gcd(n, k)` cycles. O(n) time, O(1) space, but harder to write bug-free.
