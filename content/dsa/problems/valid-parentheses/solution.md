### Intuition

Counting brackets isn't enough: `"([)]"` has one of each, yet the pairs cross. The real rule is about **order**: a closing bracket must match the **most recently opened bracket that is still open**. "Most recent first" is exactly what a stack gives you.

Read the string left to right. Every opening bracket is a promise to close it later, so push it. A closing bracket must keep the newest promise, so it has to match the top of the stack: pop it and compare. If the stack is empty at the end, every promise was kept.

### Step by step

1. Build a map from each closing bracket to its opening partner: `)` → `(`, `]` → `[`, `}` → `{`.
2. Start with an empty array `stack`.
3. For each character `ch` of `s`:
   - If `ch` is an opening bracket, push it.
   - If `ch` is a closing bracket, pop the top of the stack. If the stack was empty (`pop()` returns `undefined`) or the popped bracket isn't the partner of `ch`, return `false`.
4. After the loop, return `stack.length === 0`. Anything still on the stack was opened and never closed.

### Dry run: `"{[]()}"`

| ch | action | stack after (bottom → top) |
|---|---|---|
| `{` | push | `{` |
| `[` | push | `{ [` |
| `]` | pop `[`: its partner | `{` |
| `(` | push | `{ (` |
| `)` | pop `(`: its partner | `{` |
| `}` | pop `{`: its partner | empty |

The stack ends empty: return `true`.

Now `"([)]"`: push `(`, push `[`, then `)` pops `[`. That isn't the partner of `)`, so return `false` immediately. The crossing is caught the moment it happens.

### Edge cases

- A closing bracket with nothing open, like `")"` or `"())("`: the stack is empty, `pop()` returns `undefined`, which never equals a partner, so the answer is `false`.
- Brackets left open, like `"(()"`: every comparison succeeds, but `(` is still on the stack at the end, so the answer is `false`.
- The empty string: the loop does nothing and the empty stack gives `true`.

### Common mistakes

- Using one counter per bracket type. Counters catch `"(()"` but accept crossed pairs like `"([)]"`, because they ignore order.
- Returning `true` after the loop without checking that the stack is empty.
- Removing pairs with `s.replace("()", "")` in a loop until nothing changes. It is correct, but every pass is O(n) and there can be n / 2 passes: O(n²).

### Other ways to solve it

Push the **expected closing bracket** instead of the opening one: on `(` push `)`, on `[` push `]`, on `{` push `}`. A closing bracket is then valid exactly when it equals `stack.pop()`. Same O(n) time and space, one less lookup.
