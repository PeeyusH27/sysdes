// Run fn over items with at most `limit` calls in flight. Results keep the input order.
export async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {   // `limit` workers share one cursor
    while (i < items.length) {
      const n = i++;                                               // claim an index synchronously: no two workers get the same one
      out[n] = await fn(items[n]);
    }
  }));
  return out;
}
