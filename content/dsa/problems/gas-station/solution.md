### Intuition

The brute force starts at every station and simulates a full lap: O(n²). Two observations make it one pass.

**1. The totals decide whether any answer exists.** If the total gas is less than the total cost, no start can work, because you'd need more fuel than exists. If the total is at least the total cost, some start works (that's the part the algorithm proves).

**2. Running dry rules out a whole stretch of starts.** Say you start at `start` and the tank first goes negative on the way out of station `i`. Could any station `k` between `start` and `i` be a better start? No. Driving from `start`, you reached every such `k` with a tank of **at least zero**, since you hadn't run dry yet. Starting fresh at `k` means arriving there with exactly zero, which is no better, so you would run dry at `i` again. Every station from `start` to `i` is ruled out, and the next candidate is `i + 1`.

That's the greedy: keep driving, and every time the tank goes negative, restart just past the failure with an empty tank. Each station is visited once.

### Step by step

1. Set `total = 0`, `tank = 0`, `start = 0`.
2. For each station `i`:
   1. `gain = gas[i] - cost[i]`; add it to both `total` and `tank`.
   2. If `tank < 0`, set `start = i + 1` and `tank = 0`.
3. If `total < 0`, return `-1`; otherwise return `start`.

### Dry run: `gas = [3, 1, 2, 5]`, `cost = [2, 4, 3, 1]`

| i | gas − cost | tank | total | action |
|---|---|---|---|---|
| 0 | +1 | 1 | 1 | |
| 1 | −3 | −2 | −2 | ran dry: `start = 2`, `tank = 0` |
| 2 | −1 | −1 | −3 | ran dry: `start = 3`, `tank = 0` |
| 3 | +4 | 4 | 1 | |

`total = 1 >= 0`, so the answer is station 3.

### Why the last start works

The array is split into stretches: each failed stretch has a negative sum, and the final stretch from `start` to the end has a non-negative sum (the tank never went negative there). Starting at `start`, you reach the end of the array with that non-negative tank, then wrap around and drive the failed stretches. Their combined deficit is `total - tank`, and since `total >= 0`, the fuel you carry covers it. The tank can't dip below zero partway through the wrap-around either: counting from station 0, the running sum is at its lowest exactly at the last failure (each failure takes it to a new low, and between failures it stays above the previous low), so surviving the whole deficit means surviving every point inside it.

### Common mistakes

- Simulating a full lap from every station: correct, but O(n²), too slow for 10^5 stations.
- Restarting at `start + 1` after a failure instead of `i + 1`: it re-tries stations that observation 2 already ruled out, which brings back the O(n²) cost.
- Skipping the `total` check: the last candidate always reaches the end of the array, but without enough total fuel it fails after wrapping around.
