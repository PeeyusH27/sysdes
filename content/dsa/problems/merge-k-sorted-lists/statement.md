You are given an array `lists` of `k` linked lists. Each list is already sorted in ascending order.

Merge them into **one sorted linked list** and return its head. Reuse the existing nodes: relink them rather than creating new ones. If there are no nodes at all, return `null`.

Some lists may be empty (`null`), and `lists` itself may be empty. The tests show each list as an array of values; your function receives the head nodes.

### Constraints

- `0 <= k <= 10^4`
- `0 <=` length of each list `<= 500`, and at most `10^4` nodes in total
- `-10^4 <= node.val <= 10^4`
- Every list is sorted in ascending order.
