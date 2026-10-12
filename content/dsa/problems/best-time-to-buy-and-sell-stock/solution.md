### Intuition

The brute force tries every buy day with every later sell day: O(n²). Flip it around and fix the **sell** day instead. If you sell on day `i`, which buy day is best? Obviously the **cheapest** day before `i`.

So you never need to remember all past prices, only the minimum so far. Scan once, and at each day ask: "if I sold today, having bought at the cheapest price so far, how much would I make?" The best of those answers is the result. That is the greedy choice: of all the earlier days, only the cheapest one can ever matter.

### Step by step

1. Set `minSoFar = Infinity` and `best = 0` (making no trade is allowed).
2. For each `price`, in day order:
   1. `best = Math.max(best, price - minSoFar)`: the profit from selling today.
   2. `minSoFar = Math.min(minSoFar, price)`: today may be the cheapest buy for a later day.
3. Return `best`.

On the first day `price - Infinity` is `-Infinity`, which never beats 0, so no special case is needed.

### Dry run: `prices = [8, 3, 6, 1, 7, 4]`

| day | price | minSoFar before | sell today earns | best | minSoFar after |
|---|---|---|---|---|---|
| 0 | 8 | ∞ | -∞ | 0 | 8 |
| 1 | 3 | 8 | -5 | 0 | 3 |
| 2 | 6 | 3 | 3 | 3 | 3 |
| 3 | 1 | 3 | -2 | 3 | 1 |
| 4 | 7 | 1 | 6 | 6 | 1 |
| 5 | 4 | 1 | 3 | 6 | 1 |

### Why it works

Every possible trade is "buy on some day `j`, sell on a later day `i`". For a fixed `i`, the best `j` is the cheapest earlier day, which is exactly `minSoFar` when day `i` is processed. The loop considers every `i`, so it considers the best trade for every sell day, and the overall best is among them.

A new minimum doesn't throw away the best profit found so far; it only offers better trades for **later** sell days.

### Common mistakes

- Returning `max(prices) - min(prices)`: the cheapest day may come after the most expensive one. For `[2, 9, 1, 5]` that gives 8, but the answer is 7.
- Returning a negative number when prices only fall: start `best` at 0.
- Resetting `best` when a new minimum appears: the earlier trade is still valid.

### Other ways to solve it

Look at the day-to-day changes `prices[i] - prices[i - 1]`. Any trade's profit is the sum of a contiguous run of changes, so the answer is the largest subarray sum of the changes (Kadane's algorithm), or 0. Same O(n) time, one more idea to explain.
