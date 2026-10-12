// Closed intervals [start, end] share a point when each one starts no later than the other ends.
export function overlaps([a1, a2], [b1, b2]) {
  return a1 <= b2 && b1 <= a2;
}

// Half-open meetings [start, end): one ending at t and one starting at t don't clash, so the test is strict.
export function clashes([a1, a2], [b1, b2]) {
  return a1 < b2 && b1 < a2;
}

// The common part of two closed intervals: from the later start to the earlier end, or null if that's empty.
export function intersect([a1, a2], [b1, b2]) {
  const lo = Math.max(a1, b1);
  const hi = Math.min(a2, b2);
  return lo <= hi ? [lo, hi] : null;
}
