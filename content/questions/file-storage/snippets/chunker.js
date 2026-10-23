// Split a file into fixed-size chunks and name each one by the hash of its bytes.
// Same bytes, same name: that single idea gives dedupe, resumable upload and delta sync.
export const CHUNK = 4 * 1024 * 1024;        // 4 MiB

export async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);   // Web Crypto: browser, Node 20+, Deno
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function fixedChunks(bytes, size = CHUNK) {
  const out = [];
  for (let start = 0; start < bytes.length; start += size) {
    const part = bytes.subarray(start, Math.min(start + size, bytes.length));
    out.push({ hash: await sha256Hex(part), start, length: part.length });
  }
  return out;
}

// What the client must upload: chunks the server does not already have.
export const missing = (chunks, serverHas) => chunks.filter((c) => !serverHas.has(c.hash));
