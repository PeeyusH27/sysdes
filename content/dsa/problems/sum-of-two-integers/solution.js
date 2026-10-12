function getSum(a, b) {
  // XOR adds each column without carrying; AND finds the columns that carry,
  // and << 1 moves each carry into the next column. Repeat until no carry is left.
  // JavaScript bitwise operators work on 32-bit two's complement integers, so negative
  // numbers work too: a carry shifted past bit 31 simply disappears.
  while (b !== 0) {
    const carry = (a & b) << 1;
    a = a ^ b;
    b = carry;
  }
  return a;
}
