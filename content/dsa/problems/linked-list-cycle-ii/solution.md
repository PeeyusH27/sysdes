### Intuition

Phase one is the check from Linked List Cycle: `slow` moves one node per step, `fast` moves two, and if there is a loop they meet somewhere inside it. Phase two rests on a surprising fact: **walking forward, the meeting point is exactly as far from the cycle entry as the head is** (give or take whole laps). So put one pointer back on the head, leave the other on the meeting point, move both one node at a time, and they meet at the entry.

Here is why. Name the distances:

- `F`: the number of steps from the head to the entry,
- `C`: the length of the loop,
- `a`: how many steps past the entry `slow` is when the pointers meet.

At the meeting, `slow` has walked `F + a` steps. `fast` has walked twice as far, `2(F + a)`, and stands on the same node, so the extra `F + a` steps must be whole laps: `F + a = kC` for some `k >= 1`. Rearranged: `F = kC - a`.

Now walk one pointer from the head and one from the meeting point, one step each. After `F` steps, the first pointer is on the entry. The second started `a` steps past the entry and has walked `F` more, so it is `a + F = kC` steps past the entry: whole laps, which puts it on the entry too. They meet there, and not earlier, because the pointer from the head isn't inside the loop until it reaches the entry.

### Step by step

1. `slow = fast = head`.
2. While `fast && fast.next`: move `slow` one step and `fast` two. If `slow === fast`, go to step 3. If the loop ends, return `null` (no cycle).
3. `entry = head`. While `entry !== slow`: `entry = entry.next` and `slow = slow.next`.
4. Return `entry`.

### Dry run: values `[1, 2, 3, 4, 5, 6]`, the tail links back to index 2

The walk goes 1 → 2 → 3 → 4 → 5 → 6 → 3 → 4 → …, so `F = 2` (from 1 to 3) and `C = 4` (3, 4, 5, 6).

Phase 1:

| step | slow | fast |
|---|---|---|
| start | 1 | 1 |
| 1 | 2 | 3 |
| 2 | 3 | 5 |
| 3 | 4 | 3 (5 → 6 → 3) |
| 4 | 5 | 5 (3 → 4 → 5) |

They meet on 5, which is `a = 2` steps past the entry. Check: `F + a = 4`, one full lap.

Phase 2:

| step | entry | slow |
|---|---|---|
| start | 1 | 5 |
| 1 | 2 | 6 |
| 2 | 3 | 3 |

They meet on 3: the cycle begins there.

### Edge cases

- No cycle, including an empty list or a single node whose `next` is null: `fast` reaches `null` and the answer is `null`.
- The whole list is the loop (`pos = 0`): `F = 0`, so the pointers meet on the head itself and phase 2 returns it at once.
- A node that points to itself: after one step both pointers are on it.

### Common mistakes

- Returning the meeting node. It is somewhere in the loop, not necessarily at its entry.
- Moving one pointer two steps at a time in phase 2. Both must move one step.
- Comparing `slow.val === fast.val` instead of the nodes themselves.

### Other ways to solve it

A `Set` of visited nodes: the first node you see a second time is the entry. O(n) time and O(n) space, and no maths needed.
