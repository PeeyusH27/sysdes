// How big must a Bloom filter be? For n ids and a target false-positive rate p:
//   bits m = -n * ln(p) / (ln 2)^2      hashes k = (m / n) * ln 2
// and the rate you actually get from m bits, k hashes and n ids is (1 - e^(-k*n/m))^k.
export function bloomSize(n, p) {
  const m = Math.ceil((-n * Math.log(p)) / Math.LN2 ** 2);
  const k = Math.max(1, Math.round((m / n) * Math.LN2));
  return { bits: m, hashes: k, bytes: Math.ceil(m / 8) };
}

export function falsePositiveRate(bits, hashes, n) {
  return (1 - Math.exp((-hashes * n) / bits)) ** hashes;
}
