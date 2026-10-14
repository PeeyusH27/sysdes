# In place on a linked list: the harness reports the list from the original head after the call.
from typing import Optional


def reorder_list(head: Optional[ListNode]) -> None:
    if not head:
        return
    slow = fast = head
    while fast.next and fast.next.next:
        slow, fast = slow.next, fast.next.next
    prev, curr = None, slow.next
    slow.next = None
    while curr:
        curr.next, prev, curr = prev, curr, curr.next
    a, b = head, prev
    while b:
        a_next, b_next = a.next, b.next
        a.next, b.next = b, a_next
        a, b = a_next, b_next
