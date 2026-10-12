class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } } // @hide
// ListNode is provided in the editor.
const fromArray = (a) => a.reduceRight((next, val) => new ListNode(val, next), null);
const toArray = (h) => (h ? [h.val, ...toArray(h.next)] : []);

// Remove every node with a given value. The dummy makes "remove the head" an ordinary case.
function removeAll(head, target) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next) {
    if (prev.next.val === target) prev.next = prev.next.next; // unlink; stay put to check the new next
    else prev = prev.next;
  }
  return dummy.next;                     // not head: the old head may have been removed
}
console.log(toArray(removeAll(fromArray([7, 7, 1, 7, 2]), 7))); // [1, 2]

// Merge two sorted lists by appending behind a dummy, then return what follows it.
function merge(a, b) {
  const dummy = new ListNode();
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a ?? b;                    // attach whatever is left
  return dummy.next;
}
console.log(toArray(merge(fromArray([1, 4, 5]), fromArray([2, 3, 6])))); // [1, 2, 3, 4, 5, 6]
