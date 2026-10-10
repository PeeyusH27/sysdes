import { mulberry32 } from "@/lib/rng";

/**
 * Pure, state-in-a-number version of `mulberry32`, for reducers that must stay serialisable:
 * `draw(seed)` returns the next value and the seed to use for the call after it.
 * Calling it repeatedly replays exactly the same sequence as `mulberry32(seed)`.
 */
export function draw(seed: number): [value: number, next: number] {
  return [mulberry32(seed)(), (seed + 0x6d2b79f5) | 0];
}

/** Draw `n` values at once. */
export function drawMany(seed: number, n: number): [values: number[], next: number] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    const [v, next] = draw(s);
    out.push(v);
    s = next;
  }
  return [out, s];
}
