class EventBus {
  constructor() {
    this.subs = new Map(); // subscriber id → Set of topic patterns
    this.boxes = new Map(); // subscriber id → received [topic, message] pairs, in delivery order
  }

  // A pattern is an exact topic ("orders.created") or a prefix wildcard ("orders.*").
  static matches(pattern, topic) {
    return pattern.endsWith(".*") ? topic.startsWith(pattern.slice(0, -1)) : pattern === topic;
  }

  subscribe(pattern, id) {
    if (!this.subs.has(id)) {
      this.subs.set(id, new Set());
      this.boxes.set(id, []);
    }
    this.subs.get(id).add(pattern);
  }

  unsubscribe(pattern, id) {
    return this.subs.get(id)?.delete(pattern) ?? false;
  }

  publish(topic, message) {
    let delivered = 0;
    for (const [id, patterns] of this.subs) {
      // One delivery per subscriber, even when several of its patterns match.
      if ([...patterns].some((p) => EventBus.matches(p, topic))) {
        this.boxes.get(id).push([topic, message]);
        delivered++;
      }
    }
    return delivered;
  }

  inbox(id) {
    return [...(this.boxes.get(id) ?? [])];
  }
}
