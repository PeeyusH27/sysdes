function isPalindrome(head) {
  // 1. Find the middle: slow stops on the first node of the second half (the middle node for odd lengths).
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  // 2. Reverse the second half in place, so it can be walked from the tail towards the middle.
  let prev = null;
  while (slow) {
    const next = slow.next;
    slow.next = prev;
    prev = slow;
    slow = next;
  }
  // 3. Compare the first half with the reversed second half.
  let left = head;
  let right = prev;
  while (right) {
    if (left.val !== right.val) return false;
    left = left.next;
    right = right.next;
  }
  return true;
}
