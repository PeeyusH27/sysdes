### Intuition

To delete a node from a singly linked list you must stand on the node **before** it and set `before.next = before.next.next`. The two-pass solution counts the length `sz`, then walks to the node before position `sz - n + 1`.

One pass: use two pointers with a **fixed gap**. If `fast` is `n + 1` nodes ahead of `slow` and both move together, then when `fast` falls off the end (becomes `null`), `slow` is exactly `n + 1` nodes before the end: right in front of the n-th node from the end.

Start both pointers on a **dummy node** placed in front of the head. When `n = sz` the node to remove is the head itself, and the node before it is the dummy, so the same deletion works without a special case. Return `dummy.next`, which is not `head` when the head was removed.

### Step by step

1. `dummy = new ListNode(0, head)`; `slow = dummy`, `fast = dummy`.
2. Move `fast` forward `n + 1` times.
3. While `fast` is not null: `fast = fast.next` and `slow = slow.next`.
4. `slow.next = slow.next.next`: unlink the target.
5. Return `dummy.next`.

### Dry run: `1 → 2 → 3 → 4 → 5`, `n = 2`

After step 2, `fast` has moved 3 times from the dummy and is on `3`, while `slow` is still on the dummy.

| slow | fast |
|---|---|
| dummy | 3 |
| 1 | 4 |
| 2 | 5 |
| 3 | null |

`slow` is on `3`, right before `4` (the 2nd node from the end). Setting `3.next = 5` gives `1 → 2 → 3 → 5`.

### Edge cases

- `n` equals the length: after `n + 1` moves `fast` is already null, `slow` stays on the dummy, and `dummy.next = head.next` removes the head.
- A single node with `n = 1`: the same case, and the result is the empty list.
- `n = 1`: the tail is removed, with `slow` stopping on the second-to-last node.

### Common mistakes

- A gap of `n` instead of `n + 1`: `slow` stops **on** the node to delete instead of before it.
- Starting at `head` instead of a dummy: removing the head (n = length) then needs its own special case, and is easy to get wrong.
- Returning `head` instead of `dummy.next`: wrong whenever the head itself was removed.

### Other ways to solve it

Two passes: count the nodes, then walk `sz - n` steps from the dummy and unlink the next node. It is also O(sz) time and O(1) space; the one-pass version is the usual interview follow-up.
