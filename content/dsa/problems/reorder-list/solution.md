### Intuition

The target order uses the first half **forwards** and the second half **backwards**, alternately. A singly linked list can't walk backwards, so reverse the second half first. The problem then splits into three tools from this pattern:

1. **Find the middle** with slow and fast pointers.
2. **Cut** the list there and **reverse** the second half.
3. **Weave** the halves together: one node from the front half, one from the reversed back half, and so on.

For `1 → 2 → 3 → 4 → 5 → 6`: the halves are `1 → 2 → 3` and `4 → 5 → 6`; the second reversed is `6 → 5 → 4`; woven together they give `1 → 6 → 2 → 5 → 3 → 4`.

### Step by step

1. If the list is empty, return.
2. **Middle**: `slow = fast = head`. While `fast.next && fast.next.next`, move `slow` one step and `fast` two. Now `slow` is the last node of the first half.
3. **Cut and reverse**: `curr = slow.next`, then `slow.next = null` to end the first half. Reverse from `curr` with `prev`/`curr`/`next`; `prev` ends as the head of the reversed second half.
4. **Weave** with `a = head` and `b = prev`. While `b` is not null:
   1. Save both successors: `aNext = a.next`, `bNext = b.next`.
   2. Rewire: `a.next = b`, `b.next = aNext`.
   3. Advance: `a = aNext`, `b = bNext`.

### Dry run: `1 → 2 → 3 → 4 → 5 → 6`

Middle: `slow` stops on `3`. Cut: `1 → 2 → 3` and `4 → 5 → 6`. Reverse: `6 → 5 → 4`.

| a | b | rewire | list from the head |
|---|---|---|---|
| 1 | 6 | 1 → 6, 6 → 2 | 1 → 6 → 2 → 3 |
| 2 | 5 | 2 → 5, 5 → 3 | 1 → 6 → 2 → 5 → 3 |
| 3 | 4 | 3 → 4, 4 → null | 1 → 6 → 2 → 5 → 3 → 4 |

`b` becomes null: done.

### Edge cases

- 0, 1 or 2 nodes: the order doesn't change. With two nodes, the first half is `1`, the reversed second half is `2`, and weaving rebuilds `1 → 2`.
- Odd lengths: the first half is one node longer, so its last node (the middle of the list) ends up last, and `b` runs out first.

### Common mistakes

- Not cutting the list with `slow.next = null`. The first half still leads into the second, and after the weave the list contains a cycle.
- Saving only one successor in the weave. After `a.next = b`, the old `a.next` is lost unless you saved it first; the same goes for `b.next`.
- Returning a new head or building a new list. The function returns nothing, and the tests read from the original head.

### Other ways to solve it

Put the nodes (not the values) into an array, then relink them with two indices moving in from both ends, and set the last node's `next` to null. O(n) time and O(n) space, and simpler to get right under pressure.
