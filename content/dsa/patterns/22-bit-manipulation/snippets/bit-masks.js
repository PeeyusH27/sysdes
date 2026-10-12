// Template 1: masks. 1 << i is a number with only bit i set; combine it with &, | and ^
// to test, set, clear or toggle that one bit and leave every other bit alone.
// Bitwise operators work on 32-bit integers, so i must be between 0 and 31.
export function getBit(n, i) {
  return (n >> i) & 1;        // 0 or 1
}

export function setBit(n, i) {
  return n | (1 << i);
}

export function clearBit(n, i) {
  return n & ~(1 << i);       // ~ flips the mask: every bit is 1 except bit i
}

export function toggleBit(n, i) {
  return n ^ (1 << i);
}

// Walk all 32 bits from the lowest up, building the reversed number. >>> keeps everything unsigned.
export function reverseBits(n) {
  let result = 0;
  for (let i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1);
    n >>>= 1;
  }
  return result >>> 0;
}
