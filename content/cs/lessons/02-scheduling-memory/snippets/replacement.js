// How many page faults does a reference string cause with `frames` physical frames?
// FIFO evicts the page that has been in memory longest; LRU the one not used for longest.
export function faults(refs, frames, policy = 'lru') {
  const mem = []; // front = next victim
  let count = 0;
  for (const page of refs) {
    const at = mem.indexOf(page);
    if (at >= 0) {
      if (policy === 'lru') mem.push(...mem.splice(at, 1)); // a use makes it the newest
      continue;
    }
    count += 1;
    if (mem.length === frames) mem.shift();
    mem.push(page);
  }
  return count;
}
