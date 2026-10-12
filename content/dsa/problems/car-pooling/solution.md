### Intuition

All that matters is **how many people are in the car** at each point of the road. A trip `[p, from, to]` adds `p` passengers to every point from `from` up to (but not including) `to`. Adding `p` to every point of every trip works, but costs O(trip length) per trip.

A **difference array** records only where the load **changes**: `+p` at `from` and `-p` at `to`. The load at any stop is then the running sum of those changes. Each trip costs O(1) to record, and a single pass over the stops rebuilds every load.

### Step by step

1. Create `change`, an array of 1001 zeros (one slot per kilometre, 0 to 1000).
2. For each trip `[passengers, from, to]`:
   - `change[from] += passengers`: they get in here.
   - `change[to] -= passengers`: they are gone from here on.
3. Walk the stops in order with `load = 0`, adding `change[stop]` to `load` at each one. If `load > capacity`, return `false`.
4. Return `true`.

### Dry run: `trips = [[3, 2, 6], [2, 4, 8]]`, `capacity = 4`

After step 2: `change[2] = +3`, `change[4] = +2`, `change[6] = -3`, `change[8] = -2`, everything else 0.

| stop | change | load | over 4? |
|---|---|---|---|
| 0 | 0 | 0 | no |
| 1 | 0 | 0 | no |
| 2 | +3 | 3 | no |
| 3 | 0 | 3 | no |
| 4 | +2 | 5 | **yes → false** |

With `capacity = 5` the walk continues: the load stays 5 at stop 5, drops to 2 at stop 6 and to 0 at stop 8, so the answer is `true`.

### Why the minus goes at `to`, not `to + 1`

The group occupies the car on `from, from + 1, …, to - 1` and is already out at `to`. Writing `-p` at `to` means the load at stop `to` no longer includes them, which is exactly the rule "people get out before others get in".

### Common mistakes

- Subtracting at `to + 1`: then `[[2, 1, 4], [3, 4, 6]]` with capacity 3 shows 5 passengers at stop 4 and wrongly returns `false`.
- Only checking the load at pick-up stops of each trip **in input order**: the trips aren't sorted, so you must walk the stops in order.
- Comparing with `>=` instead of `>`: a car that is exactly full is fine.

### Other ways to solve it

- **Sweep line over events**: turn each trip into `(from, +p)` and `(to, -p)`, sort by position with drop-offs before pick-ups at the same position, and keep a running load. O(n log n) time, independent of the road length, which is better when kilometres go up to 10^9.
