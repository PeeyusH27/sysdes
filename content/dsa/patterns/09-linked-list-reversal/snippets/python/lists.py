from __future__ import annotations

from typing import List, Optional


# Helpers so the templates run on their own (the same ListNode the problems give you).
class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def from_array(values: List[int]) -> Optional[ListNode]:
    dummy = ListNode()
    tail = dummy
    for val in values:
        tail.next = ListNode(val)
        tail = tail.next
    return dummy.next


def to_array(head: Optional[ListNode]) -> List[int]:
    out: List[int] = []
    node = head
    while node:
        out.append(node.val)
        node = node.next
    return out
