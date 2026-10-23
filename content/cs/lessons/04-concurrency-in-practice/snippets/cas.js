// Compare-and-swap: write `next` only if the cell still holds `seen`. No lock, no waiting:
// if another thread got there first, read again and retry. `cells` is an Int32Array on a SharedArrayBuffer.
export function update(cells, i, fn) {
  for (;;) {
    const seen = Atomics.load(cells, i);
    const next = fn(seen);
    if (Atomics.compareExchange(cells, i, seen, next) === seen) return next; // nobody changed it
    // someone else wrote in between: our `next` was based on stale data, so loop
  }
}
