class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } } // @hide
// ListNode is provided in the editor.
const fromArray = (a) => a.reduceRight((next, val) => new ListNode(val, next), null);
const toArray = (h) => (h ? [h.val, ...toArray(h.next)] : []);

// Walk with your own pointer so `head` still points at the start afterwards.
const head = fromArray([1, 2, 3, 4]);
let sum = 0;
for (let node = head; node; node = node.next) sum += node.val;
console.log(sum, head.val);              // 10 1: head is untouched

// Reverse: save next BEFORE rewiring, or the rest of the list is lost.
function reverse(head) {
  let prev = null;
  let curr = head;
  while (curr) {
    const next = curr.next;              // 1. save
    curr.next = prev;                    // 2. rewire
    prev = curr;                         // 3. advance both
    curr = next;
  }
  return prev;                           // the old tail is the new head
}
console.log(toArray(reverse(fromArray([1, 2, 3, 4])))); // [4, 3, 2, 1]

// The broken order: rewire first, then try to step forward.
function reverseBroken(head) {
  let prev = null;
  let curr = head;
  while (curr) {
    curr.next = prev;                    // the only link to node 2 is gone
    prev = curr;
    curr = curr.next;                    // this is now prev: the loop stops after one node
  }
  return prev;
}
console.log(toArray(reverseBroken(fromArray([1, 2, 3, 4])))); // [1]
