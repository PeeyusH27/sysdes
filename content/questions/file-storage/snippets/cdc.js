// Content-defined chunking. Instead of cutting every N bytes, cut where the data itself says so: a rolling hash
// of the last few bytes hits a rare pattern. Insert a byte at the front and only the cut points near the edit move;
// everything after re-synchronises, so most chunks keep their hash.
//
// This is the "Gear" hash used by FastCDC: h = (h << 1) + GEAR[byte]. A byte stops affecting the low bits after
// about 32 more bytes, so a cut depends only on the last few bytes.

// 256 fixed pseudo-random 32-bit values (seeded, so every machine cuts the same way).
const GEAR = (() => {
  const t = new Uint32Array(256);
  let s = 0x9e3779b9;
  for (let i = 0; i < 256; i++) {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;   // xorshift32
    t[i] = s;
  }
  return t;
})();

// maskBits = 13 cuts about every 8 KiB after the minimum. Real systems use ~4 MiB chunks (maskBits about 22).
export function cdcChunks(bytes, { minSize = 2048, maxSize = 65536, maskBits = 13 } = {}) {
  const mask = (1 << maskBits) - 1;
  const cuts = [];
  let start = 0;
  let h = 0;
  for (let i = 0; i < bytes.length; i++) {
    h = ((h << 1) + GEAR[bytes[i]]) >>> 0;
    const len = i - start + 1;
    if ((len >= minSize && (h & mask) === 0) || len >= maxSize) {
      cuts.push({ start, end: i + 1 });
      start = i + 1;
      h = 0;
    }
  }
  if (start < bytes.length) cuts.push({ start, end: bytes.length });
  return cuts;
}
