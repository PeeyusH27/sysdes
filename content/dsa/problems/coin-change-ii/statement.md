You are given an `amount` and an array `coins` of distinct coin values, with an unlimited supply of each value.

Return the number of different **combinations** of coins that add up to exactly `amount`. A combination only says how many coins of each value are used, so `1 + 2` and `2 + 1` are the same combination. If the amount can't be made, return `0`. There is exactly one way to make an amount of `0`: use no coins.

### Constraints

- `0 <= amount <= 5000`
- `1 <= coins.length <= 50`
- `1 <= coins[i] <= 5000`, all different
- The answer fits in a 32-bit signed integer.
