from __future__ import annotations

from typing import List, Optional


# Helpers so the templates run on their own (the same ListNode the problems give you).
class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


# from_array(values, pos) links the tail back to index pos to make a cycle (pos = -1: no cycle).
def from_array(values: List[int], pos: int = -1) -> Optional[ListNode]:
    nodes = [ListNode(val) for val in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if pos >= 0 and nodes:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


# Reads at most `limit` values, so a cyclic list can't loop forever.
def to_array(head: Optional[ListNode], limit: int = 50) -> List[int]:
    out: List[int] = []
    node = head
    while node and len(out) < limit:
        out.append(node.val)
        node = node.next
    return out
