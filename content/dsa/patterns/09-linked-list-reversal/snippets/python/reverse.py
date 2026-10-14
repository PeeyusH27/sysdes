from __future__ import annotations

from typing import Optional

from lists import ListNode


# Template 1: reverse a list in place. prev heads the part that is already reversed; curr is the next node to flip.
# Save curr.next BEFORE overwriting it, or the rest of the list is lost.
def reverse_list(head: Optional[ListNode]) -> Optional[ListNode]:
    prev = None
    curr = head
    while curr:
        nxt = curr.next  # 1. save the rest
        curr.next = prev  # 2. flip the arrow
        prev = curr       # 3. move both pointers forward
        curr = nxt
    return prev           # the old tail is the new head
