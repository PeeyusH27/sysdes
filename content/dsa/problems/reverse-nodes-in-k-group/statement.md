You are given the `head` of a linked list and a positive integer `k`. Split the list into consecutive groups of `k` nodes, starting from the head, and reverse the nodes **inside each group**. If the last group has fewer than `k` nodes, leave it in its original order.

Rewire the nodes rather than swapping their values, use O(1) extra memory, and return the new head of the list.

### Constraints

- The list has between `0` and `5000` nodes.
- `0 <= Node.val <= 1000`
- `1 <= k <= 5000` (`k` may be larger than the length of the list)
