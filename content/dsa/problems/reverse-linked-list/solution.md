### Intuition

Reversing a list means every arrow `a → b` must become `b → a`. Walk the list once and flip one arrow per step. The only danger is that the moment you overwrite `curr.next`, you lose your only link to the rest of the list. So **save it first**.

Three pointers do the job:

- `prev`: the head of the part that is already reversed. It starts as `null`, because the first node becomes the tail and must point to null.
- `curr`: the node whose arrow you flip now.
- `next`: a copy of `curr.next`, saved just before the flip.

### Step by step

1. `prev = null`, `curr = head`.
2. While `curr` is not null:
   1. `const next = curr.next`: save the rest of the list.
   2. `curr.next = prev`: flip the arrow.
   3. `prev = curr`: the reversed part now starts at `curr`.
   4. `curr = next`: continue with the saved rest.
3. Return `prev`. When `curr` is null, `prev` is the old tail, which is the new head.

The order of the four lines matters: save, flip, then move both pointers forward. Swap lines 1 and 2 and the rest of the list is gone.

### Dry run: `1 → 2 → 3`

| step | curr | next (saved) | arrow after the flip | prev after | reversed part |
|---|---|---|---|---|---|
| 1 | 1 | 2 | 1 → null | 1 | 1 |
| 2 | 2 | 3 | 2 → 1 | 2 | 2 → 1 |
| 3 | 3 | null | 3 → 2 | 3 | 3 → 2 → 1 |

`curr` is now null: return `prev`, the node 3.

### Edge cases

- An empty list: the loop never runs and `prev` (null) is returned.
- One node: its `next` is set to null (it already was) and it is returned as the head.

### Common mistakes

- Returning `head` or `curr` at the end. `head` is now the **tail**, and `curr` is null. Return `prev`.
- Forgetting to save `next` before `curr.next = prev`: the walk stops after the first node.
- Starting with `prev = head` and `curr = head.next` without clearing `head.next`: the old head keeps pointing at the second node, which now points back at it, making a two-node cycle.

### Other ways to solve it

- **Recursion**: reverse everything after the head first (`const newHead = reverseList(head.next)`), then hang the head behind its old successor: `head.next.next = head; head.next = null;`. Same O(n) time, but O(n) call stack, which can overflow on very long lists.
- **Destructuring**: `[curr.next, prev, curr] = [prev, curr, curr.next];` performs all three updates in one line. It is safe because the whole right side is evaluated before anything is assigned.
