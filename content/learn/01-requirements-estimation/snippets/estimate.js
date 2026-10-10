const SECONDS_PER_DAY = 86_400;

// Rough numbers, rounded for saying aloud. Inputs are per day unless noted.
export function estimate({ dau, actionsPerUser, readWriteRatio = 10, bytesPerWrite = 1_000, years = 5, replicas = 3, peakFactor = 3 }) {
  const qps = (dau * actionsPerUser) / SECONDS_PER_DAY;
  const writeQps = qps / (readWriteRatio + 1);
  const readQps = qps - writeQps;
  const storageBytes = writeQps * SECONDS_PER_DAY * 365 * years * bytesPerWrite * replicas;
  return {
    avgQps: Math.round(qps),
    peakQps: Math.round(qps * peakFactor),
    readQps: Math.round(readQps),
    writeQps: Math.round(writeQps),
    storageTB: +(storageBytes / 1e12).toFixed(1),
    ingressMBps: +((writeQps * bytesPerWrite) / 1e6).toFixed(2),
  };
}

// Servers at a target utilization (headroom), given what one instance can handle
export const serversNeeded = (peakQps, perServerQps = 1_000, headroom = 0.6) =>
  Math.ceil(peakQps / (perServerQps * headroom));

// Upper bound for caching the hottest 20% of a day's reads (80/20 rule)
export const cacheGB = (readQps, bytesPerItem, hotFraction = 0.2) =>
  (readQps * SECONDS_PER_DAY * hotFraction * bytesPerItem) / 1e9;

// estimate({ dau: 10e6, actionsPerUser: 10 })
// → { avgQps: 1157, peakQps: 3472, readQps: 1052, writeQps: 105, storageTB: 49.8, ingressMBps: 0.11 }
// serversNeeded(3472) → 6 · cacheGB(1052, 1_000) → ~18.2
