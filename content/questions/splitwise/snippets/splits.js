// Strategy: each split type turns (amount in cents, participants) into one share per participant, in order,
// or null when the input makes no sense. Money is integer cents, so 10.00 is 1000 and nothing is a float.
const sum = xs => xs.reduce((a, b) => a + b, 0);
const whole = xs => xs.every(Number.isInteger);

// Proportional split. Floors lose under one cent per person, so the leftover is fewer cents than people: hand them
// out one each to the first participants in the order given. The rule is fixed so the same input always gives the same bill.
function spread(amount, weights) {
  const total = sum(weights);
  const shares = weights.map(w => Math.floor((amount * w) / total));
  for (let i = 0, left = amount - sum(shares); left > 0; i++, left--) shares[i]++;
  return shares;
}

export const SPLITS = {
  equal: (amount, users) => spread(amount, users.map(() => 1)),
  shares: (amount, users, data) => (data.length === users.length && whole(data) && data.every(w => w > 0) ? spread(amount, data) : null),
  percent: (amount, users, data) =>
    data.length === users.length && whole(data) && data.every(p => p > 0) && sum(data) === 100 ? spread(amount, data) : null,
  exact: (amount, users, data) => (data.length === users.length && whole(data) && data.every(c => c >= 0) && sum(data) === amount ? data : null),
};
