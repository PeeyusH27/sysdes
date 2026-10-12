### Intuition

The obvious approach takes two passes: count the nodes, then walk `Math.floor(n / 2)` steps from the head. Fast and slow pointers do it in one: if `fast` moves two nodes every time `slow` moves one, then when `fast` reaches the end, `slow` has gone exactly half as far. That's the middle.

### Step by step

1. Put both `slow` and `fast` on `head`.
2. While `fast` is not null **and** `fast.next` is not null:
   - `slow = slow.next` (one step),
   - `fast = fast.next.next` (two steps).
3. Return `slow`.

The loop condition decides which middle you get. With an odd length, `fast` stops **on** the last node and `slow` has made `(n - 1) / 2` steps: the exact middle. With an even length, `fast` jumps **past** the last node to `null`, and `slow` has made `n / 2` steps: the second middle.

### Dry run: `1 → 2 → 3 → 4 → 5 → 6`

| step | slow | fast |
|---|---|---|
| start | 1 | 1 |
| 1 | 2 | 3 |
| 2 | 3 | 5 |
| 3 | 4 | null (5 → 6 → null) |

`fast` is null, so the loop stops. `slow` is on 4, the second of the two middles (3 and 4), and the answer reads `[4, 5, 6]`.

### Edge cases

- One node: `fast.next` is null straight away, the loop never runs, and the head is returned.
- Two nodes: one step moves `slow` to the second node and `fast` to null, so the second node is returned, as the even-length rule requires.

### Common mistakes

- Checking only `fast.next` in the loop: on an even list `fast` becomes `null`, and reading `null.next` throws a TypeError. Check `fast` first.
- Using `while (fast.next && fast.next.next)`: that returns the **first** middle on even lengths. It's the right choice when you want to split a list into two halves, but not here.
- Returning `slow.val` instead of the node `slow`.
