// In JavaScript a function is the simplest strategy, and a function that wraps a function is the simplest decorator.
export const hourly = (rate) => ({ minutes }) => Math.ceil(minutes / 60) * rate;

export const capped = (fee, max) => (stay) => Math.min(fee(stay), max);

export const nightly = (fee, percentOff) => (stay) => {
  const night = stay.enterHour >= 22 || stay.enterHour < 6;
  const base = fee(stay);
  return night ? Math.floor((base * (100 - percentOff) + 50) / 100) : base;
};

export const price = capped(nightly(hourly(20), 50), 100);  // cap(discount(base)): read from the inside out
