### Intuition

The brute force looks to the right of every index until it finds something bigger. On a decreasing array nothing is ever found, so it scans everything: O(n²).

Turn the question around. Scan once from left to right, and let each new value **answer the elements that are still waiting** for a bigger value. Keep those waiting elements on a stack (as indices, so you know which slot of `answer` to fill).

When a new value `x` arrives, every waiting element smaller than `x` has just found its answer: `x`. And those are exactly the elements at the **top** of the stack, because the stack never increases from bottom to top: whenever something was pushed, every smaller value above it had just been popped. So pop while the top is smaller than `x`, filling in answers, then push `x` to wait for its own answer.

### Step by step

1. Create `answer` filled with `-1`: the default for elements that never find a bigger value.
2. Create an empty `stack` of indices.
3. For each index `i` from left to right:
   1. While the stack is not empty and `nums[top] < nums[i]`: pop `top` and set `answer[top] = nums[i]`.
   2. Push `i`. It now waits for its own answer.
4. Return `answer`. Indices still on the stack keep `-1`.

### Dry run: `[2, 1, 3, 5, 4]`

| i | nums[i] | popped (answer set) | stack after (values) |
|---|---|---|---|
| 0 | 2 | none | 2 |
| 1 | 1 | none: 1 is not bigger than 2 | 2, 1 |
| 2 | 3 | 1 gets 3, then 2 gets 3 | 3 |
| 3 | 5 | 3 gets 5 | 5 |
| 4 | 4 | none: 4 is not bigger than 5 | 5, 4 |

5 and 4 are never popped, so they keep `-1`: the answer is `[3, 3, 5, -1, -1]`.

### Why it works

- **Each pop gives the right answer.** Index `j` stays on the stack until the first value larger than `nums[j]` arrives. Every value in between was not larger, otherwise it would have popped `j` earlier. So the value that pops `j` is the first greater one to its right.
- **It is O(n), not O(n²).** Every index is pushed once and popped at most once, so the inner `while` runs at most n times **in total** across the whole scan, even though it sits inside the `for`.

### Common mistakes

- Popping on `<=` instead of `<`. Equal values would then answer each other, but equal is not greater: `[3, 3, 3]` must give `[-1, -1, -1]`.
- Pushing values instead of indices: when a value is popped you no longer know which slot of `answer` it belongs to.
- Creating the result with `new Array(n)` and forgetting the `-1` default: elements that are never popped come back as holes (`null` in the output).

### Other ways to solve it

Scan from right to left with a stack of **candidate answers**. For each `i`, pop every value `<= nums[i]` (they are hidden behind `nums[i]` for everything further left), then the top of the stack, if any, is the answer for `i`. Push `nums[i]`. Same O(n) time and space.
