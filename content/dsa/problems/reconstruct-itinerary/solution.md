### Intuition

Airports are nodes and tickets are directed edges, so "use every ticket exactly once" means finding an **Eulerian path** starting at `JFK`. The extra rule about lexicographic order says which one to report.

The obvious greedy plan is: from each airport, fly to the smallest destination. It breaks on dead ends. With tickets `JFK->KUL`, `JFK->NRT`, `NRT->JFK`, going to `KUL` first strands you there with a ticket left over. The airport where you get stuck must be the **last** stop of the trip, so it belongs at the end of the route even though you discovered it early.

**Hierholzer's algorithm** handles this: do a DFS that always takes the smallest unused ticket, but write an airport into the route only when you return from it, once all its outgoing tickets have been used. That produces the route backwards, so reverse it at the end. Dead ends get written first, which puts them last after the reversal, and the loops that were detoured through get spliced into the right place.

### Step by step

1. Build `graph`: for each airport, the list of its destinations. Sort each list in descending order so that `pop()` removes the lexicographically smallest.
2. Define `visit(airport)`:
   1. While the airport has unused destinations, `pop` one and `visit` it.
   2. Then push the airport onto `route`.
3. Call `visit("JFK")`.
4. Return `route` reversed.

### Dry run: `[["JFK","KUL"], ["JFK","NRT"], ["NRT","JFK"]]`

Destinations: `JFK: [NRT, KUL]` (pop gives KUL), `NRT: [JFK]`.

| event | route so far |
|---|---|
| visit JFK, pop KUL, visit KUL: no tickets left, write KUL | KUL |
| back in JFK, pop NRT, visit NRT, pop JFK, visit JFK (no tickets left): write JFK | KUL, JFK |
| finish NRT: write NRT | KUL, JFK, NRT |
| finish the first JFK: write JFK | KUL, JFK, NRT, JFK |

Reversed: `JFK, NRT, JFK, KUL`. The dead end KUL came last.

### Why it works

Whenever `visit` returns from an airport, every ticket that leaves it has been used, so that airport can be the last unvisited-stop of the remaining sub-trip. Writing airports in this finishing order and reversing gives a valid path that uses each edge once. Because we always try the smallest destination first, among valid trips the smallest one is found.

### Common mistakes

- Plain greedy without the reverse-on-return trick: it gets stuck at dead ends and returns a trip that doesn't use all tickets.
- Sorting destinations with a numeric comparator or the wrong direction: descending order is needed so that `pop()` is cheap and returns the smallest.
- Forgetting that duplicate tickets are separate edges: keep duplicates in the list.
- Marking airports as visited. You need to use *edges* once, and an airport may be visited many times.

### Other ways to solve it

**Backtracking**: try the destinations in sorted order and undo a choice if the rest of the tickets cannot be used. It is correct (the first complete path found is the smallest) but can be exponential on adversarial inputs, while Hierholzer is O(E log E).
