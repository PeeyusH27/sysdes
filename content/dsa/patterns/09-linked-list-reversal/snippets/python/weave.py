from __future__ import annotations

from typing import Optional

from lists import ListNode
from reverse import reverse_list


# Template 4: interleave two lists in place, a1 -> b1 -> a2 -> b2 -> ...
# Save BOTH successors before rewiring; whichever list is longer keeps its leftover nodes at the end.
def weave(a: Optional[ListNode], b: Optional[ListNode]) -> Optional[ListNode]:
    head = a
    while a and b:
        a_next = a.next
        b_next = b.next
        a.next = b
        b.next = a_next if a_next is not None else b_next  # if a has run out, b keeps the rest of its own list
        a = a_next
        b = b_next
    return head


# The combo: L0 -> Ln -> L1 -> Ln-1 -> ... in place. Find the middle, cut, reverse the back half, weave.
def fold(head: Optional[ListNode]) -> Optional[ListNode]:
    if not head:
        return head
    slow = head
    fast = head
    while fast.next and fast.next.next:  # slow ends on the last node of the front half
        slow = slow.next
        fast = fast.next.next
    back = reverse_list(slow.next)
    slow.next = None  # cut, or the front half still runs into the back half
    return weave(head, back)
