### Intuition

Split the job into pieces you already know:

1. Walk to `before`, the node just in front of position `left`. A **dummy** node in front of the head makes this work when `left = 1`: `before` is then the dummy.
2. Reverse the `right - left + 1` nodes after `before`, exactly like reversing a whole list with `prev`, `curr` and `next`.
3. **Splice** the reversed segment back in. After step 2 two links are wrong:
   - `before` still points at the segment's old first node, which is now its **last** node;
   - that old first node points at `null`, because `prev` was null when it was flipped. It should point at `curr`, the first node **after** the segment.

The fix is two assignments, in this order: `before.next.next = curr` (old first node → the rest of the list), then `before.next = prev` (before → the new first node).

### Step by step

1. `dummy = new ListNode(0, head)` and `before = dummy`. Move `before` forward `left - 1` times.
2. `prev = null`, `curr = before.next`. Repeat `right - left + 1` times: `next = curr.next`, `curr.next = prev`, `prev = curr`, `curr = next`.
3. Now `prev` is the segment's new first node, `curr` is the first node after the segment, and `before.next` is still the old first node.
4. `before.next.next = curr`, then `before.next = prev`.
5. Return `dummy.next`.

### Dry run: `1 → 2 → 3 → 4 → 5`, `left = 2`, `right = 4`

`before` stops on `1`. Reverse 3 nodes starting at `2`:

| step | curr | flip | prev after | curr after |
|---|---|---|---|---|
| 1 | 2 | 2 → null | 2 | 3 |
| 2 | 3 | 3 → 2 | 3 | 4 |
| 3 | 4 | 4 → 3 | 4 | 5 |

Now `1` still points at `2`, `2` points at null, and `4 → 3 → 2` is the reversed segment. Splice: `before.next.next = curr` makes `2 → 5`, and `before.next = prev` makes `1 → 4`. The result is `1 → 4 → 3 → 2 → 5`.

### Edge cases

- `left = 1`: `before` is the dummy and the head changes, which is why you return `dummy.next`.
- `left = right`: a single node is "reversed" and spliced back where it was.
- `right = n`: `curr` ends as `null`, so the old first node becomes the tail of the whole list.

### Common mistakes

- Doing the two splice assignments in the other order. After `before.next = prev`, the expression `before.next.next` refers to the **new** first node, so you rewire the wrong node.
- Counting positions from 0. `left` and `right` are 1-based, so `before` needs `left - 1` moves from the dummy.
- Returning `head`: when `left = 1`, the old head is now in the middle of the list.

### Other ways to solve it

Head insertion: keep `before` and the segment's first node `first` fixed, and `right - left` times move the node after `first` to the front of the segment:

`const moved = first.next; first.next = moved.next; moved.next = before.next; before.next = moved;`

It is one loop with no separate splice step, and the same O(n) time and O(1) space.
