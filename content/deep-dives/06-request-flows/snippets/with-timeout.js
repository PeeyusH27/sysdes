// The failure path needs a timeout helper. This doesn't cancel the underlying work; pass an AbortSignal where possible.
export function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}
