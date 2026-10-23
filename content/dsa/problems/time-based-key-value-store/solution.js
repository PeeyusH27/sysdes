class TimeMap {
  constructor() {
    this.history = new Map(); // key -> [[timestamp, value], ...] already sorted by timestamp
  }

  set(key, value, timestamp) {
    if (!this.history.has(key)) this.history.set(key, []);
    this.history.get(key).push([timestamp, value]); // timestamps for one key only grow
  }

  get(key, timestamp) {
    const list = this.history.get(key);
    if (!list) return "";
    // Binary search for the first entry written AFTER timestamp; the one before it is the answer.
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid][0] <= timestamp) lo = mid + 1;
      else hi = mid;
    }
    return lo === 0 ? "" : list[lo - 1][1];
  }
}
