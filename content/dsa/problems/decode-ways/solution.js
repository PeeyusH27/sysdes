function numDecodings(s) {
  // two = ways to decode the first i - 2 characters, one = ways for the first i - 1
  let two = 1; // the empty prefix has exactly one decoding
  let one = s[0] === "0" ? 0 : 1;
  for (let i = 2; i <= s.length; i++) {
    let ways = 0;
    if (s[i - 1] !== "0") ways += one; // last digit read as a letter on its own (1-9)
    const pair = Number(s.slice(i - 2, i));
    if (pair >= 10 && pair <= 26) ways += two; // last two digits read as one letter (10-26)
    two = one;
    one = ways;
  }
  return one;
}
