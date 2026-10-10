// The estimation step in four formulas. Round freely out loud: being 2× off is fine, 100× is not.
const SECONDS_PER_DAY = 86_400;                              // ≈ 100K, so 1M a day ≈ 12/s

export const perSecond = perDay => perDay / SECONDS_PER_DAY;

export function estimate({ writesPerDay, readsPerWrite = 0, bytesPerWrite = 0, years = 1, replicas = 1, peakFactor = 3 }) {
  const writeQps = perSecond(writesPerDay);
  const readQps = writeQps * readsPerWrite;
  const storedBytes = writesPerDay * 365 * years * bytesPerWrite;
  return {
    writeQps,
    readQps,
    peakQps: (writeQps + readQps) * peakFactor,              // traffic isn't flat: plan for 2–5× the average
    storageTB: storedBytes / 1e12,
    withReplicasTB: (storedBytes * replicas) / 1e12,
  };
}
// URL shortener: estimate({ writesPerDay: 100e6 / 30, readsPerWrite: 100, bytesPerWrite: 500, years: 5, replicas: 3 })
// → ~39 writes/s, ~3,900 reads/s, ~12K/s at peak, ~3 TB (~9 TB with replicas)
