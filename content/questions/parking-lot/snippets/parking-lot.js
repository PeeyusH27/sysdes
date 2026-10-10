import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { FITS } from './models.js';

export class ParkingLot extends EventEmitter {
  constructor({ floors, selector, pricing, clock = () => Date.now() }) {
    super();
    Object.assign(this, { floors, selector, pricing, clock, tickets: new Map() });
  }
  park(vehicle) {
    const spot = this.selector.choose(this.floors, vehicle, FITS);    // atomic within one Node process
    if (!spot) throw new Error(`Lot full for ${vehicle.type}`);
    const ticket = { id: randomUUID(), vehicle, spot, entry: this.clock() };
    this.tickets.set(ticket.id, ticket);
    this.emit('changed', spot.floor);                                 // display boards listen to this
    return ticket;
  }
  quote(ticketId) {
    const t = this.#ticket(ticketId);
    return this.pricing.fee(this.clock() - t.entry, t.vehicle);
  }
  exit(ticketId, payment) {
    const t = this.#ticket(ticketId);
    const fee = this.quote(ticketId);
    if (payment.amount < fee) throw new Error(`Payment of ${fee} required`);
    this.tickets.delete(ticketId);                                    // a ticket can only exit once
    this.floors[t.spot.floor].release(t.spot);
    this.emit('changed', t.spot.floor);
    return { fee, change: payment.amount - fee };
  }
  #ticket(id) {
    const t = this.tickets.get(id);
    if (!t) throw new Error('Unknown ticket');
    return t;
  }
}
