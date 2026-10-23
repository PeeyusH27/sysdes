// What share of the CPU goes to switching instead of working?
// All times are in microseconds. `refill` is the extra time the next thread spends
// re-warming the cache and TLB; it often costs more than the switch itself.
export function overhead(sliceUs, switchUs, refillUs = 0) {
  const lost = switchUs + refillUs;
  return lost / (sliceUs + lost);
}
