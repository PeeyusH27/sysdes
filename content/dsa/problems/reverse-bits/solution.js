function reverseBits(n) {
  let result = 0;
  for (let i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1); // append n's lowest bit to the result
    n >>>= 1;                          // unsigned shift: works for inputs of 2^31 and above
  }
  return result >>> 0;                 // reinterpret the signed 32-bit result as unsigned
}
