### Intuition

In an array you would compare `a[i]` with `a[n - 1 - i]`, walking inward from both ends. A singly linked list can only go forward, so make its second half go **backwards** instead:

1. Find the middle with slow and fast pointers.
2. Reverse the second half in place. The old tail becomes a head that leads back towards the middle.
3. Walk from the original head and from that new head at the same time, comparing values.

Each step is one linear pass using a few pointers, so the whole thing is O(n) time and O(1) extra space.

### Step by step

1. **Middle**: `slow = fast = head`. While `fast && fast.next`: `slow = slow.next`, `fast = fast.next.next`. Now `slow` is the first node of the second half (for odd lengths, the exact middle).
2. **Reverse** from `slow`: `prev = null`; repeatedly save `next = slow.next`, set `slow.next = prev`, then `prev = slow` and `slow = next`. When `slow` is null, `prev` is the old tail.
3. **Compare**: `left = head`, `right = prev`. While `right` is not null: if `left.val !== right.val`, return `false`; otherwise move both forward.
4. Return `true`.

### Dry run: `1 → 2 → 3 → 2 → 1`

- **Middle**: `slow` moves 1 → 2 → 3 while `fast` moves to the 3rd and then the 5th node. `slow` stops on `3`.
- **Reverse** from `3`: the back half becomes `1 → 2 → 3 → null`, with `prev` on the last `1`. The front half still ends `2 → 3`, so the middle `3` is shared by both walks.

| left | right | same value? |
|---|---|---|
| 1 | 1 (the old tail) | yes |
| 2 | 2 | yes |
| 3 | 3 (the same node) | yes |
| | null | stop |

`right` reached null without a mismatch: return `true`.

### Edge cases

- One node: the middle is the head, the reversed half is that single node, and it matches itself.
- Even lengths like `1 → 2 → 2 → 1`: `slow` stops on the second `2`, the reversed half is `1 → 2`, and the comparisons are 1 with 1 and 2 with 2.

### Common mistakes

- Overwriting `slow.next` before saving it during the reversal: the rest of the list is lost after one node.
- Looping `while (left)` instead of `while (right)`. On even lengths the front walk is one node longer (its last node still points into the reversed half), so `right` becomes null first and `right.val` throws.
- Comparing nodes (`left === right`) instead of their values.

### Other ways to solve it

Copy the values into an array and compare with two pointers from both ends: O(n) time and O(n) space, and a perfectly good first answer in an interview. If the caller still needs the list afterwards, reverse the second half again once you have compared it, so the list is restored.
