// Helpers so the templates run on their own (the same ListNode the problems give you).
export class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

// fromArray(values, pos) links the tail back to index pos to make a cycle (pos = -1: no cycle).
export function fromArray(values, pos = -1) {
  const nodes = values.map((val) => new ListNode(val));
  nodes.forEach((node, i) => (node.next = nodes[i + 1] ?? null));
  if (pos >= 0 && nodes.length) nodes[nodes.length - 1].next = nodes[pos];
  return nodes[0] ?? null;
}

// Reads at most `limit` values, so a cyclic list can't loop forever.
export function toArray(head, limit = 50) {
  const out = [];
  for (let node = head; node && out.length < limit; node = node.next) out.push(node.val);
  return out;
}
