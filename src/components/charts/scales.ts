/** 0-based ticks on a 1 / 2 / 2.5 / 5 step: niceTicks(35_000) → [0, 10K, 20K, 30K, 40K] */
export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => +(i * step).toPrecision(12));
}

/** Powers of ten for a log axis (values must be ≥ 1): logTicks([5256, 526, 53, 5]) → [1, 10, 100, 1000, 10000] */
export const logTicks = (values: number[]) =>
  Array.from({ length: Math.ceil(Math.log10(Math.max(...values))) + 1 }, (_, i) => 10 ** i);

/** Index of the x value closest to `px` (both in the same coordinate space). */
export function nearestIndex(xs: number[], px: number) {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - px) < Math.abs(xs[best] - px)) best = i;
  return best;
}
