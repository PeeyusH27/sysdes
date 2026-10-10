// A retry budget: retries may add at most ~10% extra load, even when every call is failing.
// Each first attempt earns credit; a retry spends 10 requests' worth of it.
export function retryBudget({ ratio = 0.1, reserve = 10 } = {}) {
  const cost = Math.round(1 / ratio);              // integer credits avoid floating-point drift
  const cap = reserve * cost;                      // a small reserve so quiet services can still retry
  let credit = cap;
  return {
    onRequest() { credit = Math.min(cap, credit + 1); },
    canRetry() {
      if (credit < cost) return false;             // budget spent: fail fast instead of piling on
      credit -= cost;
      return true;
    },
  };
}

// Retrying at every layer multiplies: 3 layers × 3 attempts each → 27 calls at the bottom
export const amplification = (layers, attemptsPerLayer) => attemptsPerLayer ** layers;

// With a budget, 1,000 failing requests get ~109 retries (about 11%) instead of 1,000 or more
