Start with a positive integer `n` and repeat one step: replace the number by the **sum of the squares of its digits**. For example, `82` becomes `8² + 2² = 68`.

`n` is **happy** if this process eventually reaches `1` (after which it stays at `1`, since `1² = 1`). Otherwise the numbers fall into a loop that never contains `1`.

Return `true` if `n` is happy and `false` otherwise.

### Constraints

- `1 <= n <= 2^31 - 1`
