You are given the `head` of a singly linked list. If the list has a cycle, return the **node where the cycle begins**: the first node on the walk from the head that is part of the loop. If there is no cycle, return `null`.

The tests describe each list as `[values, pos]`: the last node's `next` points to the node at index `pos`, or to `null` when `pos` is `-1`. Your function only receives `head`. The values in each test list are distinct, and the tests check the value of the node you return.

Don't modify the list, and try to use **O(1) extra memory**.

### Constraints

- The list has between `0` and `10^4` nodes.
- `-10^5 <= Node.val <= 10^5`
- `pos` is `-1` or a valid index in the list.
