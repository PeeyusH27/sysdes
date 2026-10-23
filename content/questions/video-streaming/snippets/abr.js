// Adaptive bitrate (ABR): the player, not the server, chooses which quality to fetch next, one short segment at a time.
// Rule of thumb used here:
//   1. Estimate throughput with an exponentially weighted average of recent segment downloads.
//   2. Pick the best rendition whose bitrate fits inside 80% of that estimate (a safety margin).
//   3. A nearly empty buffer overrides everything: drop a step now, before the video stalls.
//   4. Only step up when the buffer is comfortable, and only one step at a time, so quality does not flap.

// The bitrate ladder (bits per second). Every rendition is cut at the same segment boundaries, so the player can switch between them.
export const LADDER = [
  { label: '240p', bps: 400_000 },
  { label: '360p', bps: 800_000 },
  { label: '480p', bps: 1_200_000 },
  { label: '720p', bps: 2_500_000 },
  { label: '1080p', bps: 5_000_000 },
];

export class ThroughputEstimator {
  constructor(alpha = 0.3) {
    this.alpha = alpha;
    this.bps = null;
  }
  // Call after each segment: bytes received and the seconds it took.
  sample(bytes, seconds) {
    const x = (bytes * 8) / seconds;
    this.bps = this.bps === null ? x : this.alpha * x + (1 - this.alpha) * this.bps;
    return this.bps;
  }
}

export function pickRendition(ladder, { throughputBps, bufferS, current }, opts = {}) {
  const { safety = 0.8, panicBufferS = 5, upBufferS = 12 } = opts;
  // Best rendition that fits the safe throughput (the lowest one if none does).
  let target = 0;
  for (let i = 0; i < ladder.length; i++) if (ladder[i].bps <= throughputBps * safety) target = i;

  if (bufferS < panicBufferS && current > 0) return Math.min(target, current - 1);   // about to stall: go down at least one step
  if (target > current) return bufferS >= upBufferS ? current + 1 : current;         // up: slowly, and only with a healthy buffer
  return target;                                                                      // down or same: follow the network at once
}
