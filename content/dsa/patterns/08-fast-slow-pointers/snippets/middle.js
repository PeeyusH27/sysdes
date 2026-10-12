// Template 1: find the middle. fast moves two nodes for every one that slow moves,
// so slow is half way along when fast runs out of list.
export function middleNode(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) { // even length: slow ends on the second middle
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}

// Variant for splitting a non-empty list: the last node of the first half (the first middle on even lengths).
export function endOfFirstHalf(head) {
  let slow = head;
  let fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}
