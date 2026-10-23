// Each state is an object. It answers only the events it allows; the base class says no to the rest.
class State {
  open() { return null; }
  close() { return null; }
  lock() { return null; }
  unlock() { return null; }
}
class Closed extends State {
  name = 'closed';
  open() { return [new Open(), 'swing open']; }
  lock() { return [new Locked(), 'throw bolt']; }
}
class Open extends State {
  name = 'open';
  close() { return [new Closed(), 'latch']; }
}
class Locked extends State {
  name = 'locked';
  unlock() { return [new Closed(), 'retract bolt']; }
}

const EVENTS = new Set(['open', 'close', 'lock', 'unlock']);

export class Door {
  state = new Closed();

  send(event) {
    const result = EVENTS.has(event) ? this.state[event]() : null;
    if (!result) return { ok: false, state: this.state.name };
    const [next, action] = result;
    this.state = next;
    return { ok: true, state: next.name, action };
  }
}
