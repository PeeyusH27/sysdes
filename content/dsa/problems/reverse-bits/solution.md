### Intuition

Read the bits of `n` from the bottom, one at a time, and push each one onto the bottom of `result` while shifting `result` up:

- `n & 1` reads the lowest bit of `n`, and `n >>>= 1` moves to the next one.
- `(result << 1) | bit` makes room at the bottom of `result` and drops the bit in.

The first bit read (bit 0 of `n`) is shifted up 31 more times, so it ends at bit 31. The last bit read stays at bit 0. That is the reversal. Always run all **32** rounds, so the leading zeros of `n` become trailing zeros of the answer.

**The JavaScript part.** Bitwise operators turn numbers into **signed** 32-bit integers. Once bit 31 of `result` is set, `result` reads as negative (`1 << 31` is `-2147483648`). `result >>> 0` reinterprets the same 32 bits as unsigned, which is what the problem asks for.

### Step by step

1. Set `result = 0`.
2. Repeat 32 times:
   1. `result = (result << 1) | (n & 1)`.
   2. `n >>>= 1` (unsigned shift, so inputs of 2^31 and above shift correctly).
3. Return `result >>> 0`.

### Dry run: `n = 6` (binary `…000110`)

| round | n & 1 | result (lowest bits) |
|---|---|---|
| 1 | 0 | 0 |
| 2 | 1 | 1 |
| 3 | 1 | 11 |
| 4 | 0 | 110 |
| 5 to 32 | 0 | 110 followed by 28 zeros |

`0110` followed by 28 zeros is bits 30 and 29: 2^30 + 2^29 = **1610612736**.

### Edge cases

- `n = 1`: the answer is bit 31 alone, 2147483648. Without `>>> 0` you would return -2147483648.
- `n = 0` and `n = 2^32 - 1` (all ones) are their own reversals.

### Common mistakes

- Forgetting `>>> 0` at the end, so any answer of 2^31 or more comes out negative.
- Stopping when `n` reaches 0 instead of after 32 rounds: the leading zeros are lost, and 6 would come out as 3.
- Reversing `n.toString(2)` without padding it to 32 characters first.

### Other ways to solve it

- **Strings**: `parseInt(n.toString(2).padStart(32, "0").split("").reverse().join(""), 2)`. Clear, but slower and not what the interviewer is looking for.
- **Swap halves with masks**: swap the two 16-bit halves, then the 8-bit halves inside them, then 4, 2 and 1 bit, using masks like `0x00ff00ff`. Five steps instead of 32, which helps when reversing many numbers. Finish with `>>> 0`.
