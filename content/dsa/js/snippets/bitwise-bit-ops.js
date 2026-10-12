const bits = (x) => (x >>> 0).toString(2).padStart(8, '0');
const x = 0b10110;                               // 22

console.log((x >> 1) & 1, (x >> 3) & 1);         // 1 0: is bit k set?
console.log(bits(x | (1 << 0)));                 // 00010111: set bit 0
console.log(bits(x & ~(1 << 2)));                // 00010010: clear bit 2
console.log(bits(x ^ (1 << 4)));                 // 00000110: toggle bit 4

// x & (x - 1) clears the lowest set bit; x & -x keeps only the lowest set bit.
console.log(bits(x & (x - 1)), bits(x & -x));    // 00010100 00000010

// Power of two: exactly one bit set.
const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;
console.log(isPowerOfTwo(64), isPowerOfTwo(96), isPowerOfTwo(0)); // true false false

// Count set bits: each step removes the lowest one, so the loop runs once per set bit.
function popcount(n) {
  let count = 0;
  while (n !== 0) {                              // !== 0, not > 0: negatives have bit 31 set
    n &= n - 1;
    count++;
  }
  return count;
}
console.log(popcount(22), popcount(255), popcount(-1)); // 3 8 32

// Precedence trap: === binds tighter than &.
console.log(6 & 1 === 0, (6 & 1) === 0);         // 0 true
