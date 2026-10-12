function change(amount, coins) {
  const ways = new Array(amount + 1).fill(0); // ways[a]: combinations of the coins seen so far that make a
  ways[0] = 1;                                 // one way to make 0: no coins
  for (const coin of coins) {                  // coins OUTSIDE: every combination is built in one fixed coin order
    for (let a = coin; a <= amount; a++) {     // amounts going UP: this coin may be used again
      ways[a] += ways[a - coin];
    }
  }
  return ways[amount];
}
