Design a stack of integers that, besides the usual operations, can report the **smallest value currently in the stack** in constant time.

Implement the class `MinStack`:

- `new MinStack()` creates an empty stack.
- `push(val)` puts `val` on top of the stack.
- `pop()` removes the element on top.
- `top()` returns the element on top without removing it.
- `getMin()` returns the smallest element in the stack.

`push` and `pop` don't return anything. Every method must run in **O(1)** time, and `pop`, `top` and `getMin` are only called when the stack is not empty.

Each test is a sequence of calls. The first call creates the object. Calls that return nothing are shown as `null` in the expected output, and their return value isn't checked.

### Constraints

- `-2^31 <= val <= 2^31 - 1`
- At most `3 * 10^4` calls in total.
