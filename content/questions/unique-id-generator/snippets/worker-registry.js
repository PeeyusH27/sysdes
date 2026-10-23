// Who gets worker id 17? Two live servers with the same worker id would make duplicate ids, so ids are leased.
// A server takes the lowest id whose lease has expired, renews it before it runs out, and STOPS issuing ids if it cannot renew.
// Real systems keep this table in etcd or ZooKeeper (a lease is a key with a TTL); this is the same logic in memory.
export class WorkerRegistry {
  #leases = new Map();                 // workerId -> { owner, expiresAt }

  constructor(maxWorkers = 1024, ttlMs = 30_000) {
    this.maxWorkers = maxWorkers;
    this.ttlMs = ttlMs;
  }

  acquire(owner, now) {
    for (let id = 0; id < this.maxWorkers; id++) {
      const l = this.#leases.get(id);
      if (!l || l.expiresAt <= now || l.owner === owner) {
        this.#leases.set(id, { owner, expiresAt: now + this.ttlMs });
        return { workerId: id, expiresAt: now + this.ttlMs };
      }
    }
    throw new Error('no free worker id');
  }

  renew(workerId, owner, now) {
    const l = this.#leases.get(workerId);
    if (!l || l.owner !== owner || l.expiresAt <= now) return null;   // lost it: someone else may have it
    l.expiresAt = now + this.ttlMs;
    return { workerId, expiresAt: l.expiresAt };
  }
}

// The generator must treat the lease as a deadline with a margin: if the clock says we are within `marginMs` of expiry, stop.
export const mayIssue = (lease, now, marginMs = 5_000) => now < lease.expiresAt - marginMs;
