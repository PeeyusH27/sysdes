### Intuition

Without the stop limit this would be plain Dijkstra on prices. The limit breaks it: the cheapest way to reach a middle city may use so many flights that you can't continue from there, while a pricier way with fewer flights is the one you need. A Dijkstra that settles each city once by price throws that pricier way away.

**Bellman-Ford counts flights for you.** One round relaxes every flight once:

`next[to] = min(next[to], cost[from] + price)`

If `cost` holds the cheapest prices using at most `r` flights, then after one more round `next` holds the cheapest prices using at most `r + 1` flights. Start with only `src` at price 0 and run exactly `k + 1` rounds.

The one detail that matters: inside a round, read from **last round's array** and write into a **copy**. Otherwise a flight relaxed early in the round can be chained with a later one, sneaking two flights into a single round.

### Step by step

1. `cost = new Array(n).fill(Infinity)` and `cost[src] = 0`.
2. Repeat `k + 1` times:
   1. `next = cost.slice()`.
   2. For each `[from, to, price]`: if `cost[from] + price < next[to]`, set `next[to] = cost[from] + price`. (`Infinity + price` is still `Infinity`, so unreachable cities never relax anything.)
   3. `cost = next`.
3. Return `cost[dst]`, or `-1` if it is still `Infinity`.

### Dry run: `n = 5`, `flights = [[0,1,1], [1,2,1], [0,2,5], [2,3,1], [3,4,1]]`, `src = 0`, `dst = 3`, `k = 1`

Two rounds, so at most two flights.

| round | reads cost | improvements written to next | cost after the round |
|---|---|---|---|
| start | | | [0, ∞, ∞, ∞, ∞] |
| 1 | [0, ∞, ∞, ∞, ∞] | 0→1 = 1, 0→2 = 5 | [0, 1, 5, ∞, ∞] |
| 2 | [0, 1, 5, ∞, ∞] | 1→2 = 2 (beats 5), 2→3 = 5 + 1 = 6 | [0, 1, 2, 6, ∞] |

Answer: **6**, the route 0 → 2 → 3. Look at the flight 2→3 in round 2: it reads the **old** price 5 for city 2. The new price 2 needs two flights (0 → 1 → 2), so using it would make 0 → 1 → 2 → 3, three flights. Updating in place would wrongly return 3.

### Why it works

By induction on the rounds: after round `r`, `cost[v]` is the cheapest price of any route from `src` to `v` with at most `r` flights. Every such route is a route with at most `r - 1` flights plus one last flight, and round `r` tries every last flight on top of round `r - 1`'s prices. Reading from the copy guarantees nothing longer slips in.

### Common mistakes

- Relaxing in place without the copy (the dry run shows the wrong answer it gives).
- Running `k` rounds instead of `k + 1`: `k` stops means `k + 1` flights.
- Plain Dijkstra with one `visited` mark per city: in the dry run it settles city 2 at price 2 after two flights and can no longer reach city 3 within the limit.
- Returning `Infinity` instead of `-1` when `dst` is unreachable.

### Other ways to solve it

- **BFS by stops**: process the queue level by level (level = flights used), keeping the best price per city, for at most `k + 1` levels.
- **Dijkstra on states** `(price, city, flights used)`: skip a state if the city was already reached with fewer flights for less money. O(E · k · log(E · k)), faster when k is large and the graph sparse.
