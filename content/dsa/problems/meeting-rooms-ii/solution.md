### Intuition

The number of rooms you need is the **largest number of meetings running at the same moment**. If at some point four meetings are in progress, you need four rooms; and if never more than four run at once, four rooms are enough (whenever a meeting starts, fewer than four others are running, so a room is free).

That count only changes at two kinds of moments: a meeting **starts** (+1) or a meeting **ends** (−1). So sweep through time, visiting those moments in order and tracking the running count. This is the **sweep line** technique.

You don't even need to know which end belongs to which start. Sort all start times, sort all end times separately, and walk both lists like merging two sorted arrays. Before taking a room for the meeting starting at `s`, release the room of every meeting that ended at or before `s`.

### Step by step

1. Build `starts`, the sorted start times, and `ends`, the sorted end times.
2. Set `inUse = 0`, `most = 0` and a pointer `e = 0` into `ends`.
3. For each start time `s` in order:
   1. While `ends[e] <= s`, a meeting has finished: `inUse--`, `e++`. Using `<=` processes an end before a start at the same time, so the room is reused.
   2. `inUse++` for the meeting starting now.
   3. `most = Math.max(most, inUse)`.
4. Return `most`.

### Dry run: `[[9, 12], [10, 11], [11, 13], [14, 15]]`

`starts = [9, 10, 11, 14]`, `ends = [11, 12, 13, 15]`.

| start s | ends freed (≤ s) | inUse after | most |
|---|---|---|---|
| 9 | none | 1 | 1 |
| 10 | none (11 > 10) | 2 | 2 |
| 11 | 11 | 2 − 1 + 1 = 2 | 2 |
| 14 | 12 and 13 | 2 − 2 + 1 = 1 | 2 |

### Why splitting the starts from the ends is safe

To count how many meetings are running at time `s`, you only need two numbers: how many have started by `s` and how many have ended by `s`. Which meeting is which doesn't matter, so sorting the two lists independently loses nothing.

### Common mistakes

- Processing a start before an end at the same time (using `<` instead of `<=`): back-to-back meetings like `[1, 5]` and `[5, 10]` would need two rooms instead of one.
- Sorting the intervals by start and only comparing neighbours: that answers "is any overlap?", not "how many at once?". `[[1, 10], [2, 3], [4, 5]]` needs 2 rooms, but `[1, 10]` overlaps both.
- Forgetting the empty input: no meetings need 0 rooms.

### Other ways to solve it

**Min-heap of end times.** Sort the meetings by start. Keep a min-heap holding the end time of every room's current meeting. For each meeting, if the earliest end in the heap is `<= start`, that room is free: pop it. Then push this meeting's end. The heap's size at the end is the number of rooms. It is also O(n log n), and it tells you **which** room each meeting can use, which matters if the follow-up asks you to assign rooms. JavaScript has no built-in heap, so you'd write a small one (see the heaps cheat sheet).

**Event list.** Turn every meeting into two events, `[start, +1]` and `[end, -1]`, sort them by time with `-1` before `+1` on ties, and keep a running sum. The largest running sum is the answer.
