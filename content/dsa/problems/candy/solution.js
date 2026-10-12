function candy(ratings) {
  const n = ratings.length;
  const candies = new Array(n).fill(1);
  // Left to right: more than the left neighbour when rated higher.
  for (let i = 1; i < n; i++) {
    if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
  }
  // Right to left: more than the right neighbour too, without undoing the first pass (hence max).
  for (let i = n - 2; i >= 0; i--) {
    if (ratings[i] > ratings[i + 1]) candies[i] = Math.max(candies[i], candies[i + 1] + 1);
  }
  return candies.reduce((sum, c) => sum + c, 0);
}
