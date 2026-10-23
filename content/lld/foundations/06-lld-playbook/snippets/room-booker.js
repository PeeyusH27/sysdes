// Half-open intervals [start, end): a meeting that ends at 10 does not clash with one that starts at 10.
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export class RoomBooker {
  #bookings = new Map(); // room -> list of { start, end, who }

  constructor(rooms) {
    for (const room of rooms) this.#bookings.set(room, []);
  }

  isFree(room, start, end) {
    const list = this.#bookings.get(room);
    if (!list) throw new Error(`unknown room: ${room}`);
    return !list.some((b) => overlaps(b, { start, end }));
  }

  book(room, start, end, who) {
    if (!(start < end)) throw new RangeError('start must be before end');
    if (!this.isFree(room, start, end)) return false; // check and act in one step: no await between them
    this.#bookings.get(room).push({ start, end, who });
    return true;
  }

  freeRooms(start, end) {
    return [...this.#bookings.keys()].filter((room) => this.isFree(room, start, end));
  }
}
