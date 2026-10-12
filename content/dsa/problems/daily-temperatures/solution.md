### Intuition

This is the next greater element problem with a twist: the answer is **how far away** the warmer day is, not its temperature. The brute force scans forward from every day, which is O(n²) when the temperatures keep falling.

Walk through the days once and keep a stack of the **days still waiting** for a warmer day. Their temperatures never rise from bottom to top. When today is warmer than the day on top, that day's wait is over: today is the first warmer day after it. Pop it, record `today - thatDay`, and keep popping while today is warmer than the new top. Then push today, which now waits for its own warmer day.

Store **indices** on the stack, not temperatures: you need the index both to compute the distance and to know which slot of `answer` to fill.

### Step by step

1. `answer = new Array(n).fill(0)` and an empty `stack` of indices.
2. For each day `i`:
   1. While the stack is not empty and `temperatures[top] < temperatures[i]`: pop `j = top` and set `answer[j] = i - j`.
   2. Push `i`.
3. Return `answer`. Days still on the stack never got a warmer day and keep `0`.

### Dry run: `[71, 69, 72, 76, 70, 73, 75, 68]`

| i | temp | popped → answer | stack after (day: temp) |
|---|---|---|---|
| 0 | 71 | none | 0: 71 |
| 1 | 69 | none | 0: 71, 1: 69 |
| 2 | 72 | day 1 → 1, day 0 → 2 | 2: 72 |
| 3 | 76 | day 2 → 1 | 3: 76 |
| 4 | 70 | none | 3: 76, 4: 70 |
| 5 | 73 | day 4 → 1 | 3: 76, 5: 73 |
| 6 | 75 | day 5 → 1 | 3: 76, 6: 75 |
| 7 | 68 | none | 3: 76, 6: 75, 7: 68 |

Days 3, 6 and 7 are never popped, so the answer is `[2, 1, 1, 0, 1, 1, 0, 0]`.

### Why it works

A day is popped by the **first** warmer day after it: any warmer day in between would have popped it earlier. Each day is pushed once and popped at most once, so the nested `while` does O(n) work in total.

### Common mistakes

- Popping on `<=`: an equally warm day is not warmer. `[70, 70, 71]` must give `[2, 1, 0]`.
- Storing temperatures on the stack: you lose the day index, so you can't compute the distance.
- A nested loop that scans forward from every day: correct, but O(n²), which times out on 10^5 falling temperatures.

### Other ways to solve it

Go from right to left and reuse answers you have already computed to jump ahead: from day `i`, start at `j = i + 1`; while `temperatures[j] <= temperatures[i]`, jump to `j + answer[j]` (stop if `answer[j]` is 0, since nothing after `j` is warmer than `j`). It is amortised O(n) with no stack.
