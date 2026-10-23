// The N+1 problem: a list of 100 posts, and each post's author is fetched with its own query.
// A loader collects every load() made in the same tick and sends ONE batched call instead.
// Results are also cached per request, so the same key is fetched only once.
export function makeLoader(batchFn) {
  let queue = [];
  const cache = new Map();

  return function load(key) {
    if (cache.has(key)) return cache.get(key);
    const promise = new Promise((resolve, reject) => {
      queue.push({ key, resolve, reject });
      if (queue.length === 1) {
        queueMicrotask(async () => {
          const batch = queue; // everything asked for in this tick
          queue = [];
          try {
            const values = await batchFn(batch.map((b) => b.key));
            batch.forEach((b, i) => b.resolve(values[i]));
          } catch (err) {
            batch.forEach((b) => b.reject(err));
          }
        });
      }
    });
    cache.set(key, promise);
    return promise;
  };
}
