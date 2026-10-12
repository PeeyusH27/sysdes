You are given the `head` of a singly linked list `L0 → L1 → … → Ln-1 → Ln`. Rearrange its nodes in place into the order

`L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → …`

taking nodes alternately from the front and from the back.

Only change `next` pointers: don't modify node values or create new nodes. The function returns nothing; the tests read the list starting from the original head after your function runs.

### Constraints

- The list has between `0` and `5 * 10^4` nodes.
- `1 <= Node.val <= 1000`
