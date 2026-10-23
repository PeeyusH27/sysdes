// The URL frontier: what to fetch next, without ever hitting one host too fast.
//   - Each host has its own queue (per-host politeness), split into priority levels (0 is most urgent).
//   - A min-heap of "this host may be fetched again at time T" decides which host is ready.
//   - A host is out of the heap while one of its fetches is in flight, so two workers never hit it at once.
// The clock is passed in, so tests need no sleeping.

class MinHeap {
  #a = [];
  get size() { return this.#a.length; }
  peek() { return this.#a[0]; }
  push(x) {
    const a = this.#a;
    a.push(x);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (a[p].at <= a[i].at) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.#a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        let m = i;
        for (const c of [2 * i + 1, 2 * i + 2]) if (c < a.length && a[c].at < a[m].at) m = c;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

export const hostOf = (url) => new URL(url).host;

export class Frontier {
  // maxPerHost is the trap budget: one host cannot fill the frontier with an endless calendar.
  constructor({ defaultDelayMs = 1000, maxPerHost = 10_000, levels = 3 } = {}) {
    this.defaultDelayMs = defaultDelayMs;
    this.maxPerHost = maxPerHost;
    this.levels = levels;
    this.hosts = new Map();
    this.ready = new MinHeap();
  }

  #host(h) {
    let rec = this.hosts.get(h);
    if (!rec) {
      rec = { queues: Array.from({ length: this.levels }, () => []), size: 0, nextAt: 0, delayMs: this.defaultDelayMs, state: 'idle' };
      this.hosts.set(h, rec);
    }
    return rec;
  }

  // Returns false when the host's budget is used up.
  add(url, priority = 1) {
    const h = hostOf(url);
    const rec = this.#host(h);
    if (rec.size >= this.maxPerHost) return false;
    rec.queues[Math.min(priority, this.levels - 1)].push(url);
    rec.size++;
    if (rec.state === 'idle') {
      rec.state = 'queued';
      this.ready.push({ at: rec.nextAt, host: h });
    }
    return true;
  }

  // The next URL whose host is allowed now, or how long to wait for one.
  next(now) {
    const top = this.ready.peek();
    if (!top) return { url: null, waitMs: Infinity };      // nothing queued, or every host has a fetch in flight
    if (top.at > now) return { url: null, waitMs: top.at - now };
    this.ready.pop();
    const rec = this.hosts.get(top.host);
    const q = rec.queues.find((x) => x.length > 0);
    const url = q.shift();                                  // O(n) for a long array; a real queue uses a head index
    rec.size--;
    rec.state = 'inflight';
    return { url };
  }

  // Call when the fetch finishes. The host waits delayMs (its Crawl-delay, or the observed latency times ten) before its next turn.
  done(url, now, { delayMs } = {}) {
    const h = hostOf(url);
    const rec = this.hosts.get(h);
    if (delayMs !== undefined) rec.delayMs = delayMs;
    rec.nextAt = now + rec.delayMs;
    if (rec.size > 0) {
      rec.state = 'queued';
      this.ready.push({ at: rec.nextAt, host: h });
    } else {
      rec.state = 'idle';
    }
  }
}

// Why per-host queues matter: with a 10 s gap, one host gives 0.1 page/s,
// so a crawl at `rate` pages/s needs at least rate * gap hosts with work waiting.
export const hostsNeeded = (ratePerSec, gapSec) => Math.ceil(ratePerSec * gapSec);
