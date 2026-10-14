from __future__ import annotations

from typing import Optional

from lists import ListNode


# Template 2: a dummy node in front of the head, so the head can be removed or replaced like any other node.
def remove_all(head: Optional[ListNode], value: int) -> Optional[ListNode]:
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next:
        if prev.next.val == value:
            prev.next = prev.next.next  # unlink; don't move: the new prev.next is unchecked
        else:
            prev = prev.next
    return dummy.next  # may not be the old head any more


# Building a list: with a dummy and a tail pointer, appending never needs a special case for the first node.
def merge_sorted(a: Optional[ListNode], b: Optional[ListNode]) -> Optional[ListNode]:
    dummy = ListNode()
    tail = dummy
    while a and b:
        if a.val <= b.val:
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a if a is not None else b  # the rest of the other list is already sorted
    return dummy.next
