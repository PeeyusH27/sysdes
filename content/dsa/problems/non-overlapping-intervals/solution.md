### Intuition

Removing the fewest intervals is the same as **keeping the most** intervals that don't overlap. That is the classic interval scheduling problem, and it has a greedy answer:

> Of all the intervals you could keep next, keep the one that **ends first**.

An interval that ends early leaves the most room for everything after it. Here is the argument (an **exchange argument**). Take any best possible set of kept intervals and look at its first one. Swap it for the interval that ends earliest overall. That interval ends no later than the one it replaces, so it can't clash with anything else in the set. The set is still valid and still the same size, so some best answer starts with the earliest-ending interval. Repeat the argument for the rest.

### Step by step

1. Sort a copy of the intervals by **end**: `sort((a, b) => a[1] - b[1])`.
2. Set `lastEnd = -Infinity` (nothing kept yet) and `removed = 0`.
3. For each `[start, end]` in that order:
   - if `start >= lastEnd`, it fits after the last kept interval: keep it and set `lastEnd = end`;
   - otherwise it overlaps the last kept interval: count it as removed.
4. Return `removed`.

### Dry run: `[[1, 3], [2, 4], [3, 5], [1, 5]]`

Sorted by end: `[[1, 3], [2, 4], [3, 5], [1, 5]]` (the two intervals ending at 5 keep their original order).

| interval | lastEnd | start >= lastEnd? | action | removed |
|---|---|---|---|---|
| [1, 3] | -∞ | yes | keep, lastEnd = 3 | 0 |
| [2, 4] | 3 | 2 ≥ 3: no | remove | 1 |
| [3, 5] | 3 | 3 ≥ 3: yes (touching) | keep, lastEnd = 5 | 1 |
| [1, 5] | 5 | 1 ≥ 5: no | remove | 2 |

### Why "earliest end" and not "earliest start" or "shortest"

- Earliest start fails on `[[1, 100], [2, 3], [4, 5], [6, 7]]`: it keeps `[1, 100]` first and must then remove the other three, but removing just `[1, 100]` is enough.
- Shortest first fails on `[[1, 5], [4, 7], [6, 10]]`: it keeps `[4, 7]`, which blocks both others, while `[1, 5]` and `[6, 10]` could both stay.
- Earliest end is the choice the exchange argument proves safe.

### Common mistakes

- Using `start > lastEnd`: touching intervals would be treated as overlapping.
- Returning the number of kept intervals instead of `intervals.length - kept` (here, counting removals directly avoids the mix-up).
- Sorting by start and always keeping the earlier interval. Sorting by start can work, but on a clash you must keep the one with the **smaller end** (`lastEnd = Math.min(lastEnd, end)`).
