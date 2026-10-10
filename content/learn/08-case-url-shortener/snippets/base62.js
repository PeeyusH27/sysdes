// Base62 turns a numeric id into a short, URL-safe code and back
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function toBase62(n) {
  let s = '';
  do { s = ALPHABET[n % 62] + s; n = Math.floor(n / 62); } while (n > 0);
  return s;
}
export function fromBase62(s) {
  let n = 0;
  for (const ch of s) n = n * 62 + ALPHABET.indexOf(ch);
  return n;
}
// toBase62(125) → '21' · fromBase62('21') → 125 · 7 chars cover 62^7 ≈ 3.5 trillion codes
// Numbers stay exact up to 2^53; use BigInt beyond 8 characters.
