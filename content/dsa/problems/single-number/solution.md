### Intuition

Counting with a `Map` finds the loner in O(n) time but needs O(n) memory. XOR does it with a single number, thanks to three facts:

- `x ^ x === 0`: a value XOR-ed with itself vanishes.
- `x ^ 0 === x`: XOR with 0 changes nothing.
- XOR is commutative and associative: the order doesn't matter.

So XOR-ing the whole array is the same as pairing equal values up first: every pair becomes 0, and `0 ^ single` is the single value.

Another way to see it: look at one bit column. Each pair puts an even number of 1s in that column, so the column's XOR (its parity) is exactly the single number's bit.

### Step by step

1. Set `result = 0`.
2. For each `x` in `nums`, do `result ^= x`.
3. Return `result`.

### Dry run: `[7, 3, 5, 3, 7]`

| x | x in binary | result in binary | result |
|---|---|---|---|
| start | | 000 | 0 |
| 7 | 111 | 111 | 7 |
| 3 | 011 | 100 | 4 |
| 5 | 101 | 001 | 1 |
| 3 | 011 | 010 | 2 |
| 7 | 111 | 101 | **5** |

The intermediate values look random, but the 7s and the 3s cancel in the end, leaving 5.

### Edge cases

- A single element: the loop runs once and returns it.
- Negative numbers: JavaScript's `^` works on 32-bit two's complement integers, so each bit still cancels in pairs and the result comes back as the right negative number (`[2, -4, 2]` gives `-4`).
- The answer can be 0: `[1, 0, 1]` returns 0.

### Common mistakes

- Starting with `result = nums[0]` and then looping from index 0 again: the first value is XOR-ed twice and cancels itself.
- Sorting and comparing neighbours: it works, but it is O(n log n) and the edges (loner first or last) are easy to get wrong.
- Using a `Map` or `Set` when the problem asks for O(1) extra space.

### Other ways to solve it

- `Set`: add a value the first time, delete it the second time; the one left is the answer. O(n) time and space.
- If every other value appeared **three** times, XOR would no longer cancel. Count the 1s in each of the 32 bit columns and keep the columns whose count is not a multiple of 3.
