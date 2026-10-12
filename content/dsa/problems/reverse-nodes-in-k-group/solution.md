### Intuition

This is Reverse Linked List II applied over and over: reverse a segment of k nodes, splice it back, move on to the next segment. Three pointers carry the state from one group to the next:

- `before`: the node just in front of the current group. For the first group it is a **dummy** node, so the change of head needs no special case.
- `first`: the group's first node. After the reversal it is the group's **last** node, which makes it the `before` of the next group.
- `curr`: after reversing k nodes, the first node of the next group.

Before touching a group, check that it really has k nodes. If it doesn't, the rest of the list stays as it is and you are done.

### Step by step

1. `dummy = new ListNode(0, head)` and `before = dummy`.
2. Repeat:
   1. **Check**: walk k steps from `before`. If you hit `null`, return `dummy.next`.
   2. **Reverse**: `first = before.next`, `prev = null`, `curr = first`. Repeat k times: `next = curr.next`, `curr.next = prev`, `prev = curr`, `curr = next`.
   3. **Splice**: `before.next = prev` (the group's new first node) and `first.next = curr` (the group's new last node points at the next group).
   4. **Advance**: `before = first`.

### Dry run: `1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`, `k = 3`

| group | before | check | reversed | splice | list from the dummy |
|---|---|---|---|---|---|
| 1 | dummy | 1, 2, 3 exist | 3 → 2 → 1 | dummy → 3, 1 → 4 | 3 2 1 4 5 6 7 8 |
| 2 | 1 | 4, 5, 6 exist | 6 → 5 → 4 | 1 → 6, 4 → 7 | 3 2 1 6 5 4 7 8 |
| 3 | 4 | 7, 8, then null | not reversed | | 3 2 1 6 5 4 7 8 |

Return `dummy.next`, the node 3.

### Edge cases

- `k = 1`: every group is a single node, so the list is unchanged.
- `k` equal to the length: one group, so the whole list is reversed.
- `k` larger than the length, or an empty list: the first check fails and the list is returned untouched.

### Common mistakes

- Reversing the final short group too. Always check that k nodes exist **before** reversing anything.
- Forgetting `first.next = curr`. After the reversal the group's last node points to `null`, which cuts off the rest of the list.
- Not moving `before` to `first`: the next group gets spliced in after the wrong node.

### Other ways to solve it

- Count the length once, then reverse exactly `Math.floor(length / k)` groups, which removes the per-group check.
- Recursion: reverse the first k nodes, then set the old first node's `next` to `reverseKGroup(rest, k)`. Clean, but it uses O(n / k) call stack.
