// UUID version 7 (RFC 9562): 48 bits of Unix milliseconds, then random bits. Unlike UUID v4 (all random) it sorts by creation time,
// so new rows land at the end of a B-tree index instead of in random pages. The price over a Snowflake id: 128 bits instead of 64,
// and no machine id, so uniqueness rests on the random bits.
export function uuid7(nowMs = Date.now(), random = () => globalThis.crypto.getRandomValues(new Uint8Array(10))) {
  const bytes = new Uint8Array(16);
  let t = BigInt(nowMs);
  for (let i = 5; i >= 0; i--) { bytes[i] = Number(t & 0xffn); t >>= 8n; }     // 48-bit big-endian timestamp
  bytes.set(random(), 6);                                                      // 74 random bits are kept (bytes 6..15)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;                                         // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80;                                         // variant 10
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
