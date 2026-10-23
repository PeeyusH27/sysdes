// state -> event -> [next state, action]. A missing entry means "not allowed here".
const TABLE = {
  closed: { open: ['open', 'swing open'], lock: ['locked', 'throw bolt'] },
  open: { close: ['closed', 'latch'] },
  locked: { unlock: ['closed', 'retract bolt'] },
};

export class Door {
  state = 'closed';

  send(event) {
    // hasOwn: an event called 'toString' must not find Object.prototype.toString
    if (!Object.hasOwn(TABLE[this.state], event)) return { ok: false, state: this.state };
    const [next, action] = TABLE[this.state][event];
    this.state = next;
    return { ok: true, state: next, action };
  }
}
