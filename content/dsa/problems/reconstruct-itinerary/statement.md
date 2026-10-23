You hold a set of airline tickets, each a pair `[from, to]` of three-letter airport codes. Use **every ticket exactly once** to build one trip that **starts at `"JFK"`**, and return the airports in the order they are visited.

If several trips are possible, return the one that is smallest in **lexicographic order**, comparing the airport lists element by element (so `["JFK", "ATL", ...]` beats `["JFK", "SFO", ...]` because `"ATL" < "SFO"`).

Tickets may repeat (the same flight twice means you must fly it twice). It is guaranteed that at least one valid trip exists.

### Constraints

- `1 <= tickets.length <= 300`
- Each airport code is exactly three uppercase letters.
- A valid itinerary using all the tickets exists.
