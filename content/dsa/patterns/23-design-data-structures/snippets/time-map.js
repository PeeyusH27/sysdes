// Template 3: keep every key's history in time order (appends keep it sorted), then binary search it.
// lastAtOrBefore returns the index of the newest entry with time <= t, or -1.
export function lastAtOrBefore(history, t) {
  let lo = 0;
  let hi = history.length; // first index whose time is greater than t
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (history[mid][0] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

export class TimeMap {
  constructor() {
    this.history = new Map(); // key -> [[time, value], ...] sorted by time
  }

  set(key, value, time) {
    if (!this.history.has(key)) this.history.set(key, []);
    this.history.get(key).push([time, value]);
  }

  get(key, time) {
    const list = this.history.get(key);
    if (!list) return '';
    const i = lastAtOrBefore(list, time);
    return i === -1 ? '' : list[i][1];
  }
}
