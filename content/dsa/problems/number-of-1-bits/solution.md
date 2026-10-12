### Intuition

The direct approach checks every bit position: `(n >> i) & 1` for `i` from 0 to 30. That is always 31 checks.

A neater trick visits **only the set bits**. Subtracting 1 from `n` turns its lowest `1` into a `0` and every `0` below it into a `1`; everything above stays the same:

```
n         = 1011000
n - 1     = 1010111
n & (n-1) = 1010000   the lowest 1 is gone
```

So `n & (n - 1)` is `n` with its lowest set bit removed. Repeat until `n` is 0 and count the steps.

### Step by step

1. Set `count = 0`.
2. While `n !== 0`:
   1. `n &= n - 1` (drop the lowest set bit).
   2. `count++`.
3. Return `count`.

### Dry run: `n = 13`

| n in binary | n - 1 in binary | n & (n - 1) | count |
|---|---|---|---|
| 1101 | 1100 | 1100 | 1 |
| 1100 | 1011 | 1000 | 2 |
| 1000 | 0111 | 0000 | 3 |

`n` is now 0, so the answer is **3**: one loop per set bit, not per position.

### Edge cases

- `n = 0`: the loop never runs, so the answer is 0.
- `n = 2^31 - 1`: thirty-one 1 bits, 31 loops. It still fits in a signed 32-bit integer, so `&` handles it correctly.
- A power of two has exactly one set bit, so `n & (n - 1) === 0` is the classic "is n a power of two?" test (for `n > 0`).

### Common mistakes

- Looping with `n >> 1` while `n > 0` on values of 2^31 or more: `>>` treats them as negative 32-bit numbers. This problem's inputs fit, but use `>>>` (unsigned shift) when the input is unsigned.
- Using `n % 2` and `n / 2` without `Math.floor`: `n / 2` produces fractions and the loop never reaches 0.
- Checking only 31 positions when the input can use all 32 bits.

### Other ways to solve it

- Check each position: `for (let i = 0; i < 32; i++) count += (n >>> i) & 1;` (always 32 steps).
- Strings: `n.toString(2).replaceAll("0", "").length`. Short and correct, but it allocates strings and avoids the bit trick interviewers want to see.
