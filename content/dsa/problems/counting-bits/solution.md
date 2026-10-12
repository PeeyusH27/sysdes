### Intuition

Counting the bits of every number separately costs O(log i) per number, O(n log n) in total. You can do better by noticing that every number shares almost all of its bits with a smaller number:

`i >> 1` is `i` with its last bit chopped off. For example `13 = 1101` and `13 >> 1 = 110 = 6`.

So `i` has the same 1 bits as `i >> 1`, plus one more if its last bit (`i & 1`) is 1:

`bits[i] = bits[i >> 1] + (i & 1)`

Since `i >> 1 < i`, its answer is already in the array when you reach `i`. This is a tiny dynamic program.

### Step by step

1. Create `bits = new Array(n + 1).fill(0)`; `bits[0] = 0` is the base case.
2. For `i` from 1 to `n`: `bits[i] = bits[i >> 1] + (i & 1)`.
3. Return `bits`.

### Dry run: `n = 7`

| i | binary | i >> 1 | i & 1 | bits[i] |
|---|---|---|---|---|
| 0 | 0 | | | 0 |
| 1 | 1 | 0 | 1 | 0 + 1 = 1 |
| 2 | 10 | 1 | 0 | 1 + 0 = 1 |
| 3 | 11 | 1 | 1 | 1 + 1 = 2 |
| 4 | 100 | 2 | 0 | 1 + 0 = 1 |
| 5 | 101 | 2 | 1 | 1 + 1 = 2 |
| 6 | 110 | 3 | 0 | 2 + 0 = 2 |
| 7 | 111 | 3 | 1 | 2 + 1 = 3 |

Answer: `[0, 1, 1, 2, 1, 2, 2, 3]`.

### Why it works

Shifting right by one removes exactly one bit, the last one, and keeps all the others. So the count can only differ by that bit, which `i & 1` reads.

### Common mistakes

- `new Array(n + 1)` without `.fill(0)`: `bits[0]` is `undefined`, and `undefined + 1` is `NaN`, which then spreads through the whole array.
- Using `i / 2` instead of `i >> 1`: for odd `i` it is a fraction, and `bits[1.5]` is `undefined`.
- Returning `n` values instead of `n + 1` (0 to n inclusive).

### Other ways to solve it

- `bits[i] = bits[i & (i - 1)] + 1`: `i & (i - 1)` removes the lowest set bit, so `i` has exactly one more bit than that smaller number.
- `bits[i] = bits[i - highestPowerOfTwo] + 1`, tracking the current power of two as you go.
