// Snowflake-style 64-bit ids, generated locally with no coordination:
//
//   | 1 bit | 41 bits: ms since our epoch | 10 bits: worker | 12 bits: sequence |
//     sign          time (about 69.7 years)     1,024 workers    4,096 ids per ms
//
// Ids sort by creation time (to the millisecond), fit in a signed 64-bit integer, and two workers can never
// collide because the worker bits differ. The clock is injected so tests can move it.
export const EPOCH = 1_767_225_600_000n;          // 2026-01-01T00:00:00Z, our "time zero"
const WORKER_BITS = 10n;
const SEQ_BITS = 12n;
const MAX_SEQ = (1n << SEQ_BITS) - 1n;            // 4095
const MAX_WORKER = (1n << WORKER_BITS) - 1n;      // 1023

export class Snowflake {
  #last = -1n;
  #seq = 0n;

  // maxBackwardMs: a clock that steps back this far or less is waited out; more than that is an error.
  constructor(workerId, { now = () => BigInt(Date.now()), maxBackwardMs = 5n } = {}) {
    const w = BigInt(workerId);
    if (w < 0n || w > MAX_WORKER) throw new RangeError(`workerId must be 0..${MAX_WORKER}`);
    this.worker = w;
    this.now = now;
    this.maxBackwardMs = maxBackwardMs;
  }

  nextId() {
    let ts = this.now() - EPOCH;
    if (ts < this.#last) {
      const behind = this.#last - ts;
      if (behind > this.maxBackwardMs) throw new Error(`clock moved back ${behind} ms; refusing to issue ids`);
      while (ts < this.#last) ts = this.now() - EPOCH;        // a tiny step back (NTP slew): wait it out
    }
    if (ts === this.#last) {
      this.#seq = (this.#seq + 1n) & MAX_SEQ;
      if (this.#seq === 0n) {                                  // 4,096 ids used up in this millisecond
        while (ts <= this.#last) ts = this.now() - EPOCH;      // wait for the next one
      }
    } else {
      this.#seq = 0n;
    }
    this.#last = ts;
    return (ts << (WORKER_BITS + SEQ_BITS)) | (this.worker << SEQ_BITS) | this.#seq;
  }
}

export function decode(id) {
  const n = BigInt(id);
  return {
    timeMs: Number((n >> (WORKER_BITS + SEQ_BITS)) + EPOCH),
    worker: Number((n >> SEQ_BITS) & MAX_WORKER),
    seq: Number(n & MAX_SEQ),
  };
}

// Handy numbers for the page.
export const limits = {
  yearsOfTime: Number(1n << 41n) / (1000 * 3600 * 24 * 365.25),
  idsPerMsPerWorker: Number(MAX_SEQ + 1n),
  workers: Number(MAX_WORKER + 1n),
};
