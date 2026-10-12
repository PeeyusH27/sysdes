### Intuition

This is the merge step of merge sort, on linked lists. The smallest remaining value is always at the front of one of the two lists, so compare the two heads, take the smaller node, and repeat.

With arrays you would push values into a new array. With lists you just **relink** the nodes: keep a `tail` pointer on the last node of the merged list and attach the chosen node to `tail.next`.

A **dummy** node in front of the merged list removes the only awkward case: before anything is merged there is no head to attach to. With the dummy there always is, and the real head is simply `dummy.next` at the end.

### Step by step

1. Create `dummy = new ListNode()` and set `tail = dummy`.
2. While both lists are non-empty:
   1. If `list1.val <= list2.val`: `tail.next = list1`, then `list1 = list1.next`.
   2. Otherwise: `tail.next = list2`, then `list2 = list2.next`.
   3. `tail = tail.next`.
3. One list is now empty. Attach the rest of the other in one step: `tail.next = list1 ?? list2`. It is already sorted, and all its values are at least as large as everything merged so far.
4. Return `dummy.next`.

### Dry run: `list1 = 1 → 3 → 5`, `list2 = 2 → 4 → 6`

| step | list1 head | list2 head | take | merged so far |
|---|---|---|---|---|
| 1 | 1 | 2 | 1 | 1 |
| 2 | 3 | 2 | 2 | 1 → 2 |
| 3 | 3 | 4 | 3 | 1 → 2 → 3 |
| 4 | 5 | 4 | 4 | 1 → 2 → 3 → 4 |
| 5 | 5 | 6 | 5 | 1 → 2 → 3 → 4 → 5 |
| end | null | 6 | attach the rest | 1 → 2 → 3 → 4 → 5 → 6 |

### Edge cases

- One or both lists empty: the loop never runs, and `tail.next = list1 ?? list2` returns the other list (or null).
- Equal values: taking from `list1` on ties (`<=`) is fine; either choice gives a sorted result.

### Common mistakes

- Forgetting `tail = tail.next`: every node is attached to the same spot and overwrites the previous one.
- Attaching a node but not advancing the list it came from: the same node is attached again and again.
- Returning `dummy` instead of `dummy.next`: the answer starts with a stray 0.
- Creating `new ListNode(val)` for every value. It produces the right values, but the problem asks you to splice the existing nodes, and it uses O(n + m) extra memory.

### Other ways to solve it

Recursion: the smaller head comes first, followed by the merge of everything else. `if (list1.val <= list2.val) { list1.next = mergeTwoLists(list1.next, list2); return list1; }`, and symmetrically for `list2`, with the empty lists as base cases. Short, but it uses O(n + m) call stack.
