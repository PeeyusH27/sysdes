### Intuition

Read the tokens left to right. A number can't be used yet: it waits for its operator. When an operator arrives, it applies to the **two most recent values that haven't been used yet**, and its result becomes a new value that a later operator may use. "The most recent unused values" is a stack.

So: push numbers; on an operator, pop two values, combine them and push the result. At the end, the one value left on the stack is the answer.

### Step by step

1. Start with an empty `stack`.
2. For each token:
   - If it is `+`, `-`, `*` or `/`:
     1. `b = stack.pop()`: the **right** operand, because it was pushed last.
     2. `a = stack.pop()`: the left operand.
     3. Push `a + b`, `a - b`, `a * b` or `Math.trunc(a / b)`.
   - Otherwise it is a number: push `Number(token)`.
3. Return `stack.pop()`.

### Dry run: `["4", "13", "5", "/", "+"]`

| token | action | stack after |
|---|---|---|
| `"4"` | push 4 | 4 |
| `"13"` | push 13 | 4, 13 |
| `"5"` | push 5 | 4, 13, 5 |
| `"/"` | b = 5, a = 13, push trunc(2.6) = 2 | 4, 2 |
| `"+"` | b = 2, a = 4, push 6 | 6 |

Return 6.

### Edge cases

- A single number such as `["42"]` is already the answer.
- `"-7"` is a negative operand, not the `-` operator. Compare the **whole** token with `"-"`; don't decide by its first character.
- `Math.trunc(-1 / 3)` is `-0`. That is fine: `-0 === 0` in JavaScript.

### Common mistakes

- Popping the operands in the wrong order. For `-` and `/` the **first** pop is the right operand: `["0", "5", "-"]` is `0 - 5 = -5`, not `5`.
- `Math.floor(a / b)` instead of `Math.trunc(a / b)`. Floor rounds `-3.5` down to `-4`; truncating toward zero gives `-3`.
- Pushing the token string instead of a number: `"2" + "1"` is the string `"21"`.

### Other ways to solve it

Recursion from the right: the last token is the operator at the root of the expression. Evaluate its right operand by recursing on the tokens before it, then its left operand from where that recursion stopped. It is O(n) too, but the stack version is shorter and can't overflow the call stack.
