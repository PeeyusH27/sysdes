### Intuition

Idle time is only forced when the same letter is the bottleneck, so a good rule for every time unit is: **run the available task type that has the most copies left.** Doing the biggest backlog first keeps the other types from becoming the bottleneck later (the same instinct as scheduling the most constrained job first).

To implement "available" we need two structures:

- a **max-heap** of the remaining counts for task types that are ready to run, and
- a **cooldown queue** of types that just ran. A type that ran at time `t` can run again at time `t + n + 1`, so it re-enters the heap at the end of time `t + n`.

Because exactly one task starts per tick, cooldown entries become ready in the same order they were added, so a plain queue is enough.

### Step by step

1. Count the occurrences of each letter and put all counts in a max-heap.
2. Set `time = 0` and make an empty cooldown queue of `[remaining, readyAt]`.
3. While the heap or the queue is not empty:
   1. `time++`.
   2. If the heap is not empty, pop the largest count and run one copy. If copies remain, add `[remaining - 1, time + n]` to the queue. (If the heap is empty, this tick is idle.)
   3. If the front of the queue has `readyAt === time`, remove it and push its count back into the heap.
4. Return `time`.

### Dry run: `["A","A","A","B","B","B"]`, `n = 2`

| time | action | heap after | cooling after |
|---|---|---|---|
| 1 | run A (3 -> 2) | B:3 | A:2 ready at 3 |
| 2 | run B (3 -> 2) | | A:2 at 3, B:2 at 4 |
| 3 | idle; A returns | A:2 | B:2 at 4 |
| 4 | run A (2 -> 1); B returns | B:2 | A:1 at 6 |
| 5 | run B (2 -> 1) | | A:1 at 6, B:1 at 7 |
| 6 | idle; A returns | A:1 | B:1 at 7 |
| 7 | run A (done); B returns | B:1 | |
| 8 | run B (done) | | |

Total time: **8**.

### Why it works

The most frequent letter, appearing `maxCount` times, forces `(maxCount - 1)` gaps of length `n`: `A _ _ A _ _ A`. Every other task can sit inside those gaps, and idle slots appear only when there are too few other tasks to fill them. Always running the largest backlog keeps the pattern tight. The simulation produces exactly that schedule without having to reason about gaps.

### Common mistakes

- Putting a cooled-down task back one tick early or late: it must re-enter at the end of `time + n`, so it is runnable at `time + n + 1`.
- Ending the loop when the heap is empty while tasks are still cooling down.
- Treating `n` as the total gap length instead of the number of units *between* two equal tasks.

### Other ways to solve it

**Closed form**, O(T): let `maxCount` be the highest frequency and `k` the number of letters that reach it. The answer is `max(tasks.length, (maxCount - 1) * (n + 1) + k)`. The first term covers the case where there are enough other tasks to avoid any idle time; the second is the skeleton `A _ _ A _ _ A` with the `k` tied letters sharing the last row. For the example, `(3 - 1) * 3 + 2 = 8`.
