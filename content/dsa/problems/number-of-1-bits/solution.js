function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= n - 1; // clears the lowest set bit
    count++;
  }
  return count;
}
