// The OT protocol around transform(): a central server puts all edits in one order, and each client keeps
// at most one edit "in flight" while buffering the rest. This is the shape of Google Docs-style (Jupiter) collaboration.
import { apply, transform, transformAgainst } from './ot.js';

export class Server {
  doc = '';
  history = [];                                   // every accepted op, in the one true order. rev = history.length

  // `op` was made on the document as it was at revision `baseRev`. Move it past everything accepted since.
  receive(op, baseRev) {
    const concurrent = this.history.slice(baseRev);
    const fixed = transformAgainst(op, concurrent);
    this.doc = apply(this.doc, fixed);
    this.history.push(fixed);
    return { op: fixed, rev: this.history.length };
  }
}

export class Client {
  constructor(site) {
    this.site = site;
    this.doc = '';
    this.rev = 0;                                 // the last server revision we have applied
    this.inflight = null;                         // sent, not yet acknowledged
    this.buffer = [];                             // made after `inflight`, not sent yet
  }

  // The user typed. Show it at once; send it now if nothing is in flight, otherwise buffer it.
  local(op) {
    this.doc = apply(this.doc, op);
    if (!this.inflight) {
      this.inflight = op;
      return { op, baseRev: this.rev };
    }
    this.buffer.push(op);
    return null;
  }

  // The server tells us about someone else's edit (already in server order at revision `rev`).
  remote(op, rev) {
    let incoming = op;
    if (this.inflight) {                          // our unacknowledged edits happened "after" it on our screen
      const mine = this.inflight;
      this.inflight = transform(mine, incoming);
      incoming = transform(incoming, mine);
    }
    this.buffer = this.buffer.map((b) => {
      const moved = transform(b, incoming);
      incoming = transform(incoming, b);
      return moved;
    });
    this.doc = apply(this.doc, incoming);
    this.rev = rev;
  }

  // The server accepted our in-flight edit as revision `rev`. Send the next buffered one, if any.
  ack(rev) {
    this.rev = rev;
    this.inflight = this.buffer.shift() ?? null;
    return this.inflight ? { op: this.inflight, baseRev: rev } : null;
  }
}
