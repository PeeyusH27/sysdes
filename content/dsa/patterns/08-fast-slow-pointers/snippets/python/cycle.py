from __future__ import annotations

from typing import Optional

from lists import ListNode


# Template 2: Floyd's cycle detection. Inside a loop, fast gains exactly one node per step on slow,
# so it can't jump over it: they meet. Without a loop, fast falls off the end.
def has_cycle(head: Optional[ListNode]) -> bool:
    slow = head
    fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:  # the same node, not just an equal value
            return True
    return False


# Phase 2: the head and the meeting point are equally far from the cycle's entry (up to whole laps),
# so two pointers moving one step at a time from those two places meet exactly at the entry.
def cycle_start(head: Optional[ListNode]) -> Optional[ListNode]:
    slow = head
    fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            entry = head
            while entry is not slow:
                entry = entry.next
                slow = slow.next
            return entry
    return None
