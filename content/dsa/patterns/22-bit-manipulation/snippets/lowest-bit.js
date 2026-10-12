// Template 3: n & (n - 1) removes the lowest set bit. n - 1 flips that bit to 0 and every 0 below
// it to 1, so the AND keeps the higher bits and wipes out the rest.
export function popcount(n) {
  let count = 0;
  while (n !== 0) {
    n &= n - 1;                 // one iteration per set bit
    count++;
  }
  return count;
}

// A power of two has exactly one set bit, so removing it leaves 0.
export function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

// n & -n keeps only the lowest set bit (-n is ~n + 1 in two's complement).
export function lowestSetBit(n) {
  return n & -n;
}

// Counts for every number 0..n: i >> 1 is i without its last bit, already computed.
export function countBitsUpTo(n) {
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}
