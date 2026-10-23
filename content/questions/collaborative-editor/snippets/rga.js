// A sequence CRDT (RGA, "replicated growable array") for text. No server has to order edits and nothing is transformed:
// every character has a permanent id, an insert says "after the character with id X", and a delete just marks a character dead
// (a tombstone). Applying the same set of operations in any order that respects cause-before-effect gives the same text.
//
// id = { c: counter, s: site }. Ids are totally ordered: by counter, then by site.
const cmp = (a, b) => (a.c !== b.c ? a.c - b.c : a.s - b.s);
const same = (a, b) => a && b && a.c === b.c && a.s === b.s;

export class Replica {
  constructor(site) {
    this.site = site;
    this.clock = 0;                          // Lamport counter: larger than any id we have seen
    this.nodes = [];                         // the sequence, tombstones included: { id, ch, dead }
  }

  text() {
    return this.nodes.filter((n) => !n.dead).map((n) => n.ch).join('');
  }

  // Local edit at a visible position. Returns the operation to send to the others.
  insertAt(pos, ch) {
    const visible = this.nodes.filter((n) => !n.dead);
    const after = pos === 0 ? null : visible[pos - 1].id;
    const op = { type: 'insert', id: { c: ++this.clock, s: this.site }, after, ch };
    this.apply(op);
    return op;
  }

  deleteAt(pos) {
    const target = this.nodes.filter((n) => !n.dead)[pos];
    const op = { type: 'delete', id: target.id };
    this.apply(op);
    return op;
  }

  // Apply a local or remote operation. Returns false if it cannot be applied yet (its parent has not arrived).
  apply(op) {
    this.clock = Math.max(this.clock, op.id.c);
    if (op.type === 'delete') {
      const n = this.nodes.find((x) => same(x.id, op.id));
      if (!n) return false;
      n.dead = true;                         // idempotent: deleting twice is the same as once
      return true;
    }
    if (this.nodes.some((x) => same(x.id, op.id))) return true;          // already have it (duplicate delivery)
    let i = 0;
    if (op.after) {
      const at = this.nodes.findIndex((x) => same(x.id, op.after));
      if (at < 0) return false;
      i = at + 1;
    }
    // Skip over siblings (and their descendants) with larger ids: the newest insert at one spot goes first, on every replica.
    while (i < this.nodes.length && cmp(this.nodes[i].id, op.id) > 0) i++;
    this.nodes.splice(i, 0, { id: op.id, ch: op.ch, dead: false });
    return true;
  }
}

// Deliver a batch of operations in any order; those whose parent is missing wait and retry.
export function deliver(replica, ops) {
  let pending = [...ops];
  for (let progress = true; progress && pending.length;) {
    const before = pending.length;
    pending = pending.filter((op) => !replica.apply(op));
    progress = pending.length < before;
  }
  return pending.length;                     // 0 when everything was applied
}
