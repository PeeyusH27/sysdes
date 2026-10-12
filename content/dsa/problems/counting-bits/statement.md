Given an integer `n`, return an array `bits` of length `n + 1` where `bits[i]` is the number of `1` bits in the binary representation of `i`, for every `i` from `0` to `n`.

Aim for O(n) time: one pass that reuses earlier answers instead of counting each number's bits from scratch.

### Constraints

- `0 <= n <= 10^5`
