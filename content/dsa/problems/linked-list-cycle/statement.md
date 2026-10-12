You are given the `head` of a singly linked list. Return `true` if the list contains a **cycle**, meaning that following `next` pointers from the head eventually brings you back to a node you have already visited. Return `false` if the walk reaches `null`.

The tests describe each list as `[values, pos]`: the list holds `values` in order, and the last node's `next` points to the node at index `pos`, or to `null` when `pos` is `-1`. Your function only receives `head`; it never sees `pos`.

Try to solve it with **O(1) extra memory**.

### Constraints

- The list has between `0` and `10^4` nodes.
- `-10^5 <= Node.val <= 10^5`
- `pos` is `-1` or a valid index in the list.
