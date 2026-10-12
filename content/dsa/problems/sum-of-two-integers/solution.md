### Intuition

Add two binary numbers the way you add on paper, one column at a time:

- The digit you write in a column is 1 when exactly one of the two bits is 1. That is **XOR**: `a ^ b` is the sum with every carry ignored.
- A column carries when both bits are 1. That is **AND**, and the carry belongs one column to the left: `(a & b) << 1`.

So `a + b` equals `(a ^ b) + ((a & b) << 1)`: the sum without carries, plus the carries. That is another addition, so repeat the same split until the carry is 0. The carry's lowest bit moves at least one column left every round, so after at most 32 rounds it is gone.

Negative numbers need no special case in JavaScript: bitwise operators work on 32-bit two's complement integers, a carry pushed past bit 31 is simply dropped, and the result is read back as a signed number. That is exactly how 32-bit hardware adds.

### Step by step

1. While `b !== 0`:
   1. `carry = (a & b) << 1` (compute it from the **current** `a` and `b`).
   2. `a = a ^ b`.
   3. `b = carry`.
2. Return `a`.

### Dry run: `a = 3`, `b = 5`

| a | b | a ^ b | (a & b) << 1 |
|---|---|---|---|
| 0011 | 0101 | 0110 | 0010 |
| 0110 | 0010 | 0100 | 0100 |
| 0100 | 0100 | 0000 | 1000 |
| 0000 | 1000 | 1000 | 0000 |

The carry is now 0, so the answer is `a = 1000`, which is **8**.

### Why it works

At every step `a + b` stays the same: XOR keeps the bits that don't carry, and the shifted AND adds back exactly the carries. The loop ends only when `b`, the pending carry, is 0, and then `a` alone holds the sum.

### Common mistakes

- Updating `a = a ^ b` first and computing the carry from the **new** `a`: the carries are lost.
- Porting a Python solution with `0xFFFFFFFF` masks. Python integers have no fixed width, so it needs them; JavaScript's `&`, `^` and `<<` already work on 32 bits.
- Sneaking in `-` through `a - (-b)` or `Math` tricks: the point of the exercise is the bitwise loop.

### Other ways to solve it

The same idea written recursively: `getSum(a, b)` returns `a` when `b === 0`, and `getSum(a ^ b, (a & b) << 1)` otherwise.
