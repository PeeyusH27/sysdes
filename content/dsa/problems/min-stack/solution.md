### Intuition

`push`, `pop` and `top` are what an array already does. The hard part is `getMin` **after a pop**. One variable `min` works while values only arrive, but when the current minimum is popped you need the minimum of what is left, and rescanning the stack is O(n).

Notice that the part of the stack **below** an element can't change while that element is in the stack: pushes and pops only happen above it. So "the minimum at the moment this element was pushed" stays true for as long as the element lives. Store it **next to the value**: each entry is a pair `[value, minSoFar]`.

The top entry's `minSoFar` covers the whole stack, so it is the answer to `getMin`. And popping needs no repair: the entry below already holds the minimum of everything that remains.

### Step by step

1. Keep one array `items` whose entries are pairs `[value, minSoFar]`.
2. `push(val)`: if the stack is empty, `minSoFar = val`; otherwise `minSoFar = Math.min(val, minSoFar of the top entry)`. Push `[val, minSoFar]`.
3. `pop()`: `items.pop()`. Nothing else to fix.
4. `top()`: return the value of the top entry, `items[items.length - 1][0]`.
5. `getMin()`: return the `minSoFar` of the top entry, `items[items.length - 1][1]`.

### Dry run: push 3, push 5, push 2, getMin, pop, top, getMin

| call | items after (bottom → top) | returns |
|---|---|---|
| push 3 | [3, 3] | |
| push 5 | [3, 3] [5, 3] | |
| push 2 | [3, 3] [5, 3] [2, 2] | |
| getMin | unchanged | 2 |
| pop | [3, 3] [5, 3] | |
| top | unchanged | 5 |
| getMin | unchanged | 3 |

After popping 2, the top entry `[5, 3]` already knows the minimum is 3. Nothing was recomputed.

### Why it works

The entry `[v, m]` stores the minimum of `v` and every value below it. Only the part of the stack above an entry ever changes, so `m` stays correct for as long as the entry exists. The top entry has the whole stack below it, so its `m` is the minimum of the whole stack.

### Common mistakes

- A single `min` variable. It is right until the minimum is popped; then it reports a value that is no longer in the stack.
- A separate stack of minimums that only gets a push when `val < min` (strictly). With two copies of the minimum, the first pop removes it from the min stack while the other copy is still in the main stack. Push when `val <= min`.

### Other ways to solve it

Two stacks: the main stack, plus a stack of minimums that gets a push when `val <= current minimum` and a pop when the popped value equals the current minimum. Every operation is still O(1), and it uses less memory when the minimum rarely changes.
