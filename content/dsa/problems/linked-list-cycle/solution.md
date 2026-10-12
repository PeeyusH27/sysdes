### Intuition

With a `Set` of visited nodes, a cycle shows up as the first node you see twice. That costs O(n) memory.

Floyd's "tortoise and hare" uses two pointers instead: `slow` moves one node per step and `fast` moves two.

- **No cycle**: `fast` reaches the end (`null`) first, and you can stop.
- **Cycle**: both pointers end up running round the loop forever. Every step, `fast` gains exactly one node on `slow`, so the gap between them, measured along the loop, shrinks by one per step. A gap that shrinks by one at a time can't skip over zero: at some step they stand on the same node.

### Step by step

1. `slow = head`, `fast = head`.
2. While `fast` and `fast.next` are not null:
   1. `slow = slow.next`, `fast = fast.next.next`.
   2. If `slow === fast`, return `true`.
3. Return `false`: `fast` fell off the end of the list.

### Dry run: values `[4, 9, 2, 7]`, the tail links back to index 1

Walking from the head visits 4 → 9 → 2 → 7 → 9 → 2 → 7 → …

| step | slow | fast |
|---|---|---|
| start | 4 | 4 |
| 1 | 9 | 2 |
| 2 | 2 | 9 (2 → 7 → 9) |
| 3 | 7 | 7 (9 → 2 → 7) |

They stand on the same node (7): return `true`.

### Why it works

When `slow` enters the loop (of length `C`), `fast` is already somewhere in it. Say `fast` is `d` nodes behind `slow` along the loop, with `0 <= d < C`. Each step reduces `d` by exactly 1 (fast +2, slow +1), so after `d` steps they meet. Since `d < C`, `slow` is caught before it completes one lap, and the whole run is O(n).

### Common mistakes

- Comparing values (`slow.val === fast.val`) instead of nodes. Different nodes can hold the same value.
- Comparing **before** moving: both pointers start on the head, so the check succeeds immediately on every list.
- Testing only `fast.next` in the loop condition: when `fast` itself is `null`, reading `fast.next` throws.

### Other ways to solve it

A `Set` of visited nodes: add each node as you walk and return `true` when a node is already in the set. O(n) time and O(n) space. It is a fine first answer, and interviewers usually follow up by asking for O(1) space.
