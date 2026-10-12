function minEatingSpeed(piles, h) {
  // Hours needed at speed k: a partly used hour still costs a whole hour.
  const hoursAt = (k) => {
    let hours = 0;
    for (const p of piles) hours += Math.ceil(p / k);
    return hours;
  };
  let lo = 1;
  let hi = Math.max(...piles);         // at this speed each pile takes one hour, and h >= piles.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (hoursAt(mid) <= h) hi = mid;   // fast enough: the answer is mid or something slower
    else lo = mid + 1;                 // too slow: the answer is faster than mid
  }
  return lo;
}
