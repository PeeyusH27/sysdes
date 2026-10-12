There are `n` gas stations on a circular road. Station `i` holds `gas[i]` units of fuel, and driving from station `i` to the next station (station `i + 1`, or station `0` after the last one) uses `cost[i]` units.

Your car has an unlimited tank and starts **empty** at one of the stations. At every station you pick up all of its fuel, then drive on to the next one. The tank must never go below zero on the way.

Return the index of the station from which you can drive all the way around the circle once, ending back where you started. If no station works, return `-1`. The tests guarantee that when a valid start exists, it is the only one.

### Constraints

- `1 <= n <= 10^5`
- `gas.length === cost.length === n`
- `0 <= gas[i], cost[i] <= 10^4`
