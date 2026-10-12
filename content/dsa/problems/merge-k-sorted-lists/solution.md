### Intuition

Merging **two** sorted lists is easy: compare the two heads, take the smaller, advance. With **k** lists the same idea holds: the next node of the result is always the smallest of the k current heads. Scanning all k heads for every node costs O(k) per node, O(N·k) in total for N nodes.

A **min-heap of the heads** finds the smallest head in O(log k). Pop it, append it to the result, and push its `next` node, which is the new head of that list. The heap always holds at most one node per list, so it never grows beyond `k`.

### Step by step

1. Create a min-heap of nodes ordered by value: `new Heap((a, b) => a.val - b.val)`.
2. Push the head of every **non-empty** list.
3. Make a `dummy` node and set `tail = dummy`, so appending the first node is not a special case.
4. While the heap is not empty:
   1. Pop the node with the smallest value.
   2. Append it: `tail.next = node`, then `tail = node`.
   3. If `node.next` exists, push it.
5. Return `dummy.next` (which is `null` when there were no nodes).

### Dry run: `lists = [[1, 4], [2, 5], [3]]`

| step | heap before (values) | pop | push | result so far |
|---|---|---|---|---|
| start | 1, 2, 3 | | | |
| 1 | 1, 2, 3 | 1 | 4 (next in its list) | 1 |
| 2 | 2, 3, 4 | 2 | 5 | 1, 2 |
| 3 | 3, 4, 5 | 3 | nothing: that list is done | 1, 2, 3 |
| 4 | 4, 5 | 4 | nothing | 1, 2, 3, 4 |
| 5 | 5 | 5 | nothing | 1, 2, 3, 4, 5 |

### Why it works

The heap always contains exactly one node from each list that still has nodes left: that list's smallest remaining node. The overall smallest remaining node is the smallest of those, so the heap's top is always the right next node. Each node is pushed once and popped once.

### Edge cases

- `lists = []` or every list empty: the heap starts empty and `dummy.next` is `null`, which the tests display as `[]`.
- `null` entries in `lists` must be skipped when filling the heap; otherwise the comparator reads `null.val` and throws.
- Equal values from different lists are fine: the heap breaks ties arbitrarily and the result is still sorted.

### Common mistakes

- Pushing `null` heads into the heap.
- Forgetting `tail = node` after `tail.next = node`, so every node overwrites the same link.
- Pushing **every** node of every list up front: still correct, but the heap grows to N nodes (O(N log N) time, O(N) space) instead of staying at k.
- Merging the lists one after another into a growing result: each merge re-walks the result, which is O(N·k) in total.

### Other ways to solve it

- **Divide and conquer**: merge the lists in pairs (list 0 with 1, 2 with 3, …), then merge the results in pairs, like merge sort. There are log k rounds and each round touches all N nodes: O(N log k) time with O(1) extra space besides recursion. It only needs a merge-two-lists helper, no heap.
