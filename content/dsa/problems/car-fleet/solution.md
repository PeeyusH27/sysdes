### Intuition

Think about each car's **arrival time if the road were empty**: `(target - position) / speed`. Now look at two cars A (ahead) and B (behind).

- If B's empty-road time is **at most** A's, B would arrive no later than A, so it catches A on the way (or exactly at the finish) and gets stuck behind it. They become one fleet that arrives at A's time.
- If B's time is **greater** than A's, B arrives later even driving freely, so it never touches A.

So the only thing to track is the arrival time of the fleet directly in front. Process cars from the closest to the target backwards: a car starts a new fleet exactly when its time is strictly larger than the time of the fleet ahead; otherwise it merges and the fleet's time stays the same (it is the slower leader's time). This is a monotonic stack where only the top is ever compared, so a single variable is enough.

### Step by step

1. Sort the cars by `position`, largest first.
2. Set `fleets = 0` and `slowest = 0` (the arrival time of the front fleet).
3. For each car in that order:
   1. Compute `time = (target - position) / speed`.
   2. If `time > slowest`, this car forms a new fleet: increment `fleets` and set `slowest = time`.
   3. Otherwise it joins the fleet ahead; do nothing.
4. Return `fleets`.

### Dry run: `target = 12`, positions `[10, 8, 0, 5, 3]`, speeds `[2, 4, 1, 1, 3]`

Sorted by position, closest first:

| position | speed | time | vs `slowest` | fleets |
|---|---|---|---|---|
| 10 | 2 | 1 | 1 > 0: new fleet, slowest = 1 | 1 |
| 8 | 4 | 1 | 1 <= 1: merges | 1 |
| 5 | 1 | 7 | 7 > 1: new fleet, slowest = 7 | 2 |
| 3 | 3 | 3 | 3 <= 7: merges with the car at 5 | 2 |
| 0 | 1 | 12 | 12 > 7: new fleet | 3 |

### Edge cases

- No cars: the loop does not run and the answer is 0.
- Equal arrival times mean the follower reaches the destination at the same moment as the car ahead: that is one fleet, hence `>` and not `>=`.
- Only the closest car's relationship matters: a fast car behind two slow cars merges into the fleet in front of it, and that fleet's time is already the larger of the two.

### Common mistakes

- Sorting by position ascending and walking forwards: the comparison then needs the future, not the past.
- Using integer division for the time. Use real division; `(12 - 3) / 3` and `(12 - 5) / 1` must be compared as real numbers.
- Comparing speeds instead of arrival times. A fast car that starts very far back may still arrive later than a slow car near the target.
- Resetting `slowest` to the new car's time when it merges. A merged car travels at the leader's pace, so the fleet's time stays the same.

### Other ways to solve it

**Explicit stack of times**: push a time when a new fleet starts and compare with the top; the answer is the stack size. It is the same algorithm, written with a stack to show the "monotonic stack" connection.
