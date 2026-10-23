import { Door } from './door-table.js';
import { Emitter } from './emitter.js';

export class ObservableDoor {
  #door = new Door();
  #changes = new Emitter();

  get state() { return this.#door.state; }
  subscribe(listener) { return this.#changes.subscribe(listener); }

  send(event) {
    const from = this.#door.state;
    const result = this.#door.send(event);
    // Announce after the change is done, and only for legal moves. Push: the event says what happened.
    const errors = result.ok ? this.#changes.emit({ from, event, to: result.state }) : [];
    return { ...result, errors };
  }
}
