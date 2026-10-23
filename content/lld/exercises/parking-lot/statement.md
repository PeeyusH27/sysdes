Build a **multi-floor parking lot**. Vehicles arrive, get a ticket and a spot, and pay when they leave. Two decisions will change in real life, so they must be changeable at runtime without touching the rest of the code: **which free spot a vehicle gets**, and **how the fee is computed**.

Implement the class `ParkingLot`:

- `ParkingLot(floors)`: `floors` is an array of floors, and each floor is an array of spot types, in order, for example `[["bike", "compact", "large"], ["compact", "compact", "large"]]`. A spot is identified by its floor index and its index on the floor, so `"1-2"` is floor 1, third spot. At the start, the spot policy is `"smallest-first"` and the pricing is `"hourly"`.
- `park(plate, vehicle)`: `vehicle` is `"bike"`, `"car"` or `"truck"`. Picks a free spot that fits and returns a new **ticket id**: `1` for the first successful park, then `2`, `3` and so on. Returns `-1` if nothing fits, if the vehicle type is unknown, or if a vehicle with this `plate` is already parked. A failed `park` does not use up a ticket id.
- `leave(ticketId, minutes)`: the vehicle leaves after `minutes` minutes (an integer, `>= 0`). Frees its spot and returns the fee in **cents**. Returns `-1` for an unknown ticket or a ticket that has already been used. Ticket ids are never reused.
- `available(floor, spotType)`: how many **free** spots of exactly that type the floor has (`0` for a floor or type that does not exist).
- `spotOf(ticketId)`: the spot of a vehicle that is still parked, as `"floor-index"` (for example `"0-2"`), or `""` if the ticket is unknown or already used.
- `useSpotPolicy(name)` and `usePricing(name)`: switch the policy, see below. Return `true`, or `false` (and change nothing) if the name is not one of the listed ones.

**What fits where**

| Vehicle | Spot types it can use |
|---|---|
| `"bike"` | `"bike"`, `"compact"`, `"large"` |
| `"car"` | `"compact"`, `"large"` |
| `"truck"` | `"large"` |

**Spot policies** choose among the *free spots that fit*. Spot types are ordered `bike` < `compact` < `large`, and the spot index breaks any remaining tie (lower first).

- `"smallest-first"`: the smallest spot type, then the lowest floor, then the lowest index. A car takes a compact spot on any floor before it uses a large one.
- `"lowest-floor-first"`: the lowest floor, then the smallest spot type, then the lowest index. A car takes a large spot on floor 0 before a compact spot on floor 1.

**Pricing policies** compute the fee from the vehicle type (never the spot type) and the minutes:

- `"hourly"`: the first **10 minutes are free**. Beyond that, every *started* hour is charged at a per-vehicle rate: bike 100, car 200, truck 500 cents per hour. So 10 minutes costs 0, 11 minutes is one hour, 60 is one hour, 61 is two hours.
- `"flat"`: one fee per visit, by vehicle only: bike 300, car 500, truck 1200 cents. There is no free period: even 0 minutes is charged.

**Switching policies** takes effect immediately and only for later calls. A vehicle already parked stays where it is. The fee is computed by the pricing that is in force **when `leave` is called**, whichever pricing was active when the vehicle arrived.

**Design requirements**

The tests cannot see your classes, but the idea of the exercise is visible in how you would answer "now add a third pricing rule" or "now prefer the floor nearest the exit". If `park` and `leave` contain `if (policy === "hourly") ... else ...`, every new rule edits and risks the code that already works. Keep **spot choice** and **pricing** each behind their own small seam (an interface, a function, or a lookup of named strategies), keep the lot responsible only for spots and tickets, and make the lot depend on those seams rather than on the concrete rules. Adding a policy should mean adding one new entry and no change to `park`, `leave` or the ticket book.

**Notes**

- A plate is "already parked" from a successful `park` until the matching `leave`. After that it can park again and gets a new ticket.
- A car may park in a large spot when no compact spot is free. The fee still depends on the vehicle, not on the spot.
- `available` counts free spots of the exact type, so a free large spot is not counted as a compact one.
