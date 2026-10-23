// The congestion window (cwnd), in segments, for each round trip.
// Slow start doubles it until ssthresh, then congestion avoidance adds 1 per round trip.
// A loss cuts it: 3 duplicate ACKs halve it and carry on; a timeout drops it to 1 and starts over.
export function cwndSeries({ rounds = 30, initial = 10, ssthresh = 64, loss = null } = {}) {
  const out = [];
  let cwnd = initial;
  let threshold = ssthresh;
  for (let r = 0; r < rounds; r++) {
    out.push(cwnd);
    if (loss && r === loss.round) {
      threshold = Math.max(2, Math.floor(cwnd / 2));
      cwnd = loss.kind === 'timeout' ? 1 : threshold;
    } else if (cwnd < threshold) {
      cwnd = Math.min(cwnd * 2, threshold);
    } else {
      cwnd += 1;
    }
  }
  return out;
}

// Throughput is roughly one window per round trip.
export const throughputMbps = (segments, rttMs = 50, mss = 1460) => (segments * mss * 8) / (rttMs / 1000) / 1e6;
