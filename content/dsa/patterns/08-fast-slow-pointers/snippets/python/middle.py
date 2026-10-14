from __future__ import annotations

from typing import Optional

from lists import ListNode


# Template 1: find the middle. fast moves two nodes for every one that slow moves,
# so slow is half way along when fast runs out of list.
def middle_node(head: Optional[ListNode]) -> Optional[ListNode]:
    slow = head
    fast = head
    while fast and fast.next:  # even length: slow ends on the second middle
        slow = slow.next
        fast = fast.next.next
    return slow


# Variant for splitting a non-empty list: the last node of the first half (the first middle on even lengths).
def end_of_first_half(head: ListNode) -> ListNode:
    slow = head
    fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    return slow
