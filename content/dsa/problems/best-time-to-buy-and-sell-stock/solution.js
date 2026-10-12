function maxProfit(prices) {
  let minSoFar = Infinity; // cheapest price on any day up to now
  let best = 0;            // not trading at all earns 0
  for (const price of prices) {
    best = Math.max(best, price - minSoFar); // sell today, having bought at the cheapest earlier price
    minSoFar = Math.min(minSoFar, price);
  }
  return best;
}
