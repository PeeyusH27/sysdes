// Catching near-duplicate pages (mirrors, "?print=1" copies, a changed ad). An exact hash changes completely when one
// word changes. A simhash changes only a few bits, so "how many bits differ?" measures how different the text is.
const MASK = (1n << 64n) - 1n;

// 64-bit FNV-1a of a word.
function hash64(word) {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < word.length; i++) {
    h ^= BigInt(word.charCodeAt(i));
    h = (h * 0x100000001b3n) & MASK;
  }
  return h;
}

// Overlapping 3-word shingles keep some word order in the fingerprint.
function shingles(text, size = 3) {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (words.length <= size) return [words.join(' ')];
  const out = [];
  for (let i = 0; i + size <= words.length; i++) out.push(words.slice(i, i + size).join(' '));
  return out;
}

export function simhash(text) {
  const votes = new Array(64).fill(0);
  for (const s of shingles(text)) {
    const h = hash64(s);
    for (let b = 0; b < 64; b++) votes[b] += (h >> BigInt(b)) & 1n ? 1 : -1;
  }
  let out = 0n;
  for (let b = 0; b < 64; b++) if (votes[b] > 0) out |= 1n << BigInt(b);
  return out;
}

export function hamming(a, b) {
  let x = a ^ b;
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

// Pages whose fingerprints are within 3 bits are treated as the same page (the threshold Google's paper used for 64-bit simhash).
export const isNearDuplicate = (a, b, maxBits = 3) => hamming(simhash(a), simhash(b)) <= maxBits;
