// Resumable chunked upload, client side. The server remembers how many bytes it has (in order);
// after any failure the client asks "where are you?" and continues from there instead of starting over.
export const CHUNK = 8 * 1024 * 1024;          // 8 MiB: big enough to be efficient, small enough that a failure wastes little

export function chunkPlan(size, chunk = CHUNK) {
  const parts = [];
  for (let start = 0; start < size; start += chunk) parts.push({ start, end: Math.min(start + chunk, size) });
  return parts;
}

// `session.offset()` asks the server how many bytes it has; `session.put(start, end)` sends one chunk and may throw.
export async function upload(size, session, { maxRetries = 5, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let failures = 0;
  let sent = 0;
  for (;;) {
    const have = await session.offset();                    // truth lives on the server
    if (have >= size) return { sent };
    const todo = chunkPlan(size).filter((p) => p.end > have);
    try {
      for (const p of todo) {
        await session.put(Math.max(p.start, have), p.end);
        sent += p.end - Math.max(p.start, have);
      }
    } catch (err) {
      if (++failures > maxRetries) throw err;
      await sleep(Math.min(30_000, 2 ** failures * 250));   // exponential backoff; real code adds jitter
    }
  }
}
