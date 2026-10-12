function isHappy(n) {
  const next = (x) => {
    let sum = 0;
    while (x > 0) {
      const digit = x % 10;
      sum += digit * digit;
      x = Math.floor(x / 10);
    }
    return sum;
  };
  // Every sequence ends in a loop (1 → 1 is a loop too). Floyd finds a node inside it; check whether that is 1.
  let slow = n;
  let fast = next(n);
  while (fast !== 1 && slow !== fast) {
    slow = next(slow);
    fast = next(next(fast));
  }
  return fast === 1;
}
