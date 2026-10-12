// Helpers so the templates run on their own (the same ListNode the problems give you).
export class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

export function fromArray(values) {
  const dummy = new ListNode();
  let tail = dummy;
  for (const val of values) tail = tail.next = new ListNode(val);
  return dummy.next;
}

export function toArray(head) {
  const out = [];
  for (let node = head; node; node = node.next) out.push(node.val);
  return out;
}
