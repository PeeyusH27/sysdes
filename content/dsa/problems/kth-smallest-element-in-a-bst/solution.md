### Intuition

You could collect every value, sort them and take the k-th: O(n log n). But a BST is already sorted if you read it in the right order. **In-order traversal** (left subtree, then the node, then the right subtree) visits the values from smallest to largest. So the k-th node visited is the k-th smallest value, and we can stop right there without touching the remaining nodes.

### Step by step

1. Keep an empty stack and a pointer `node` starting at the root.
2. While `node` is not null or the stack is not empty:
   1. Push `node` and move to its left child until you run out of left children.
   2. Pop the top of the stack. This is the next value in sorted order.
   3. Decrement `k`. If it reaches 0, return the popped node's value.
   4. Continue with the popped node's right child.

### Dry run: `[5, 3, 6, 2, 4, null, null, 1]`, `k = 3`

| action | stack (top at right) | k |
|---|---|---|
| go left from 5: push 5, 3, 2, 1 | 5, 3, 2, 1 | 3 |
| pop **1** (smallest), no right child | 5, 3, 2 | 2 |
| pop **2**, no right child | 5, 3 | 1 |
| pop **3**, k becomes 0, return 3 | 5 | 0 |

### Edge cases

- `k = 1` returns the leftmost node, found after the first descent.
- `k = n` visits every node and returns the maximum.
- A tree that is a single chain works the same; only the stack height changes.

### Common mistakes

- Doing pre-order or post-order: those do not produce sorted values in a BST.
- Counting from 0 and returning the (k+1)-th value, or decrementing after the check.
- Traversing the entire tree and then indexing the result when an early exit is available.

### Other ways to solve it

**Recursive in-order** with a counter variable in an enclosing scope and a flag to stop early. Same O(h + k) time. If the tree is modified often and k-th queries are frequent, store the size of each node's subtree and descend by comparing k with the left subtree size: O(h) per query.
