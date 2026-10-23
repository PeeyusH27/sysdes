// Ticket servers: a database hands out numbers, apps ask for them in blocks.
// One auto-increment row is the classic way to get unique, ordered ids. Its weakness is a round trip per id and one machine.
// Two fixes: hand out blocks (one round trip per 1,000 ids), and run two servers, one giving odd numbers, one even.

// What the database does, in memory. Real SQL: UPDATE tickets SET next = next + $size WHERE id = 1 RETURNING next - $size.
export class TicketServer {
  constructor(start = 1, step = 1) {
    this.next = start;
    this.step = step;
    this.roundTrips = 0;
  }
  // Reserve `size` ids. The caller owns [first, first + size * step).
  allocate(size) {
    this.roundTrips++;
    const first = this.next;
    this.next += size * this.step;
    return { first, size, step: this.step };
  }
}

// The app side: take a block, give out ids from it locally, fetch another when it runs dry.
export class BlockAllocator {
  #block = null;
  #used = 0;

  constructor(servers, blockSize = 1000) {
    this.servers = servers;
    this.blockSize = blockSize;
    this.turn = 0;
  }

  nextId() {
    if (!this.#block || this.#used === this.#block.size) {
      const server = this.servers[this.turn++ % this.servers.length];   // alternate servers; if one is down, use the other
      this.#block = server.allocate(this.blockSize);
      this.#used = 0;
    }
    return this.#block.first + this.#used++ * this.#block.step;
  }
}
