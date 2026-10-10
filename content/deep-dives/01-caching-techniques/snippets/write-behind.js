// @display-only: needs a database client (`db`) and a logger (`log`)
// Batch writes in memory and flush every 5 s. If a flush fails, put the batch back without
// overwriting newer values, and never run two flushes at once.
const buffer = new Map();
let flushing = false;
export const write = (id, value) => buffer.set(id, value);       // the latest value per id wins

setInterval(async () => {
  if (flushing || buffer.size === 0) return;
  flushing = true;
  const batch = [...buffer];
  buffer.clear();
  try {
    await db.bulkUpsert(batch);
  } catch (err) {
    for (const [id, value] of batch) if (!buffer.has(id)) buffer.set(id, value);   // retry next tick
    log.warn({ err, size: batch.length }, 'write-behind flush failed');
  } finally {
    flushing = false;
  }
}, 5_000);
// A process crash still loses whatever is in `buffer`. That's the trade-off you accept with write-behind.
