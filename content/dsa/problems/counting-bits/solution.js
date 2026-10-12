function countBits(n) {
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    // i >> 1 is i without its last bit, and its count is already known.
    bits[i] = bits[i >> 1] + (i & 1);
  }
  return bits;
}
