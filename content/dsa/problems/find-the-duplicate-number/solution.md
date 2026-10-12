### Intuition

The rules close every easy door: a `Set` needs O(n) space, and sorting or negating values in place modifies the array. The trick is to see a **linked list hidden in the indices**:

- Each index `i` is a node, and its `next` is the index `nums[i]`.
- Every value is between 1 and n, so every `next` is a valid index and the walk from index 0 never stops. There are only n + 1 nodes, so it must eventually loop.
- No value is 0, so nothing points back to index 0: it sits on the tail that leads into the loop.
- The loop's entry is reached by two different arrows, one from the tail and one from the end of the loop. Two different indices `i` and `j` with `nums[i] === nums[j]` means the entry's index is a value that appears twice: **the entry is the duplicate**.

Finding where a loop begins in O(1) space is exactly Floyd's algorithm from Linked List Cycle II, with `node.next` replaced by `nums[index]`.

### Step by step

1. `slow = 0`, `fast = 0`.
2. **Phase 1**, find a meeting point: repeat `slow = nums[slow]` and `fast = nums[nums[fast]]` until `slow === fast`. Use `do … while`, because the pointers start equal.
3. **Phase 2**, find the entry: `entry = 0`. While `entry !== slow`: `entry = nums[entry]` and `slow = nums[slow]`.
4. Return `entry`.

### Dry run: `nums = [4, 3, 1, 4, 2]`

The arrows are 0 → 4 → 2 → 1 → 3 → 4 → …: index 4 is entered from 0 and from 3, because `nums[0]` and `nums[3]` are both 4.

Phase 1:

| step | slow | fast |
|---|---|---|
| start | 0 | 0 |
| 1 | 4 | 2 (0 → 4 → 2) |
| 2 | 2 | 3 (2 → 1 → 3) |
| 3 | 1 | 2 (3 → 4 → 2) |
| 4 | 3 | 3 (2 → 1 → 3) |

Phase 2:

| step | entry | slow |
|---|---|---|
| start | 0 | 3 |
| 1 | 4 | 4 |

They meet at index 4, so the duplicate is 4.

### Why it works

Floyd's argument applies unchanged. If `F` is the number of steps from index 0 to the loop's entry and the pointers met `a` steps into the loop, then `F + a` is a whole number of laps. Walking `F` more steps from the meeting point lands on the entry, at the same moment as the pointer that starts at index 0.

### Common mistakes

- Returning the phase 1 meeting point. It is some index inside the loop, not necessarily the entry.
- Writing phase 1 as `while (slow !== fast)` with both pointers at 0: the loop body never runs. Use `do … while`, or start `fast` one step ahead.
- Mixing up indices and values. The answer is the **index** where the phase 2 pointers meet, which equals the repeated value.
- Sorting a copy or using a `Set`: correct, but they break the O(1)-space rule.

### Other ways to solve it

Binary search on the value: for a guess `m`, count how many elements are `<= m`. If the count is greater than `m`, there are too many small values, so the duplicate is in `[1, m]`; otherwise it is in `[m + 1, n]`. That is O(n log n) time, O(1) space, and doesn't modify the array: a good fallback if you don't spot the cycle.
