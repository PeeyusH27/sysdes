from __future__ import annotations

from typing import Optional

from lists import ListNode


# Template 3: reverse the k nodes after `before` (they must exist) and splice them back into place.
# Returns the segment's new last node, which is the `before` of whatever comes next.
def reverse_after(before: ListNode, k: int) -> ListNode:
    first = before.next  # will become the segment's last node
    prev = None
    curr = first
    for _ in range(k):
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    before.next = prev  # before -> the segment's new first node
    first.next = curr   # the segment's new last node -> the rest of the list
    return first


# Example: swap every two adjacent nodes, which is "reverse in groups of 2".
def swap_pairs(head: Optional[ListNode]) -> Optional[ListNode]:
    dummy = ListNode(0, head)
    before = dummy
    while before.next and before.next.next:
        before = reverse_after(before, 2)
    return dummy.next
