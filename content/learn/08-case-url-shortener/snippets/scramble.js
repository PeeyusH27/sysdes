// Sequential ids give guessable codes (…aZ, …b0). Multiply by a constant coprime with 62^7.
// The map is a bijection on [0, 62^7), so codes stay unique and 7 characters long.
// It's linear, though: anyone holding two consecutive codes can walk the rest. If enumeration
// must be impossible, use random codes with a uniqueness check instead.
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const M = 62n ** 7n;                       // 3,521,614,606,208
const P = 2_176_477_561_533n;              // ≈ 0.618·M; odd and not a multiple of 31, so coprime with 2^7·31^7
const P_INV = modInverse(P, M);

export const scramble = id => (BigInt(id) * P) % M;
export const unscramble = x => (BigInt(x) * P_INV) % M;
export const shortCode = id => toBase62Big(scramble(id)).padStart(7, '0');
// shortCode(1) → 'CjIO2GV' · shortCode(2) → 'eDrC5nQ' · shortCode(3) → 'QXaq84L'

function modInverse(a, m) {                // extended Euclid
  let [r0, r1, s0, s1] = [a, m, 1n, 0n];
  while (r1) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  return ((s0 % m) + m) % m;
}
function toBase62Big(n) {
  let s = '';
  do { s = ALPHABET[Number(n % 62n)] + s; n /= 62n; } while (n > 0n);
  return s;
}
