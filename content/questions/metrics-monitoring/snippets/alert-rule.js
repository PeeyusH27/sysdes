// An alert rule is a small state machine, evaluated on a schedule:
//   inactive -> pending (condition true) -> firing (true for `forMs`) -> resolved (condition false) -> inactive
// The "pending" step is what stops a one-second blip from waking someone up. `missing` says what no data means:
// a host that stopped reporting should usually alert, not look healthy.
export class AlertRule {
  state = 'inactive';
  #since = null;                   // when the condition first became true

  constructor({ name, threshold, forMs, missing = 'alert' }) {
    Object.assign(this, { name, threshold, forMs, missing });
  }

  // value: the latest aggregated value, or null/undefined when there is no data. Returns an event or null.
  evaluate(value, now) {
    const bad = value == null ? this.missing === 'alert' : value > this.threshold;
    if (bad) {
      if (this.state === 'inactive' || this.state === 'resolved') {
        this.state = 'pending';
        this.#since = now;
      }
      if (this.state === 'pending' && now - this.#since >= this.forMs) {
        this.state = 'firing';
        return { type: 'fire', name: this.name, since: this.#since };
      }
      return null;
    }
    const was = this.state;
    this.#since = null;
    if (was === 'firing') { this.state = 'resolved'; return { type: 'resolve', name: this.name }; }
    this.state = 'inactive';          // a pending blip simply goes away
    return null;
  }
}

// Notifications must not be a flood. One page per group, with the members listed, and at most one repeat per interval.
export class Notifier {
  #last = new Map();               // group key -> last page time

  constructor(repeatMs = 4 * 60 * 60 * 1000) { this.repeatMs = repeatMs; }

  // events: [{ type: 'fire', name, labels }]. groupBy: which label ties alerts into one page, such as cluster.
  page(events, groupBy, now) {
    const groups = new Map();
    for (const e of events.filter((x) => x.type === 'fire')) {
      const key = e.labels?.[groupBy] ?? 'ungrouped';
      groups.set(key, [...(groups.get(key) ?? []), e.name]);
    }
    const pages = [];
    for (const [key, names] of groups) {
      const last = this.#last.get(key);
      if (last !== undefined && now - last < this.repeatMs) continue;      // already paged recently
      this.#last.set(key, now);
      pages.push({ group: key, alerts: names });
    }
    return pages;
  }
}
