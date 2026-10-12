// Every bitwise operator first converts its operands to 32-bit signed integers.
console.log(1 << 30, 1 << 31, 1 << 32);           // 1073741824 -2147483648 1: bit 31 is the sign; shift counts wrap at 32
console.log((2 ** 32 + 5) | 0, 3.9 | 0, -3.9 | 0); // 5 3 -3: high bits dropped, fractions truncated
console.log(~5, ~-1, ~~7.8);                      // -6 0 7: ~x equals -x - 1

// >> keeps the sign (fills with the sign bit); >>> fills with zeros.
console.log(-8 >> 1, -8 >>> 1);                   // -4 2147483644
console.log(-1 >>> 0, (1 << 31) >>> 0);           // 4294967295 2147483648: >>> 0 reads the bits as unsigned

// Printing bits: pad to a fixed width, and go through >>> 0 for negatives.
console.log((5).toString(2).padStart(8, '0'));    // 00000101
console.log((-5).toString(2), (-5 >>> 0).toString(2)); // -101 11111111111111111111111111111011
console.log(parseInt('1011', 2), 0b1011);         // 11 11

// Past 31 bits, bitwise operators silently drop the high bits. Use arithmetic or BigInt.
const big = 2 ** 40 + 3;
console.log(big >> 1, Math.floor(big / 2));       // 1 549755813889: >> threw away bits 32 and up
console.log((big >> 40) & 1, Math.floor(big / 2 ** 40) % 2, (BigInt(big) >> 40n) & 1n); // 0 1 1n: is bit 40 set?
