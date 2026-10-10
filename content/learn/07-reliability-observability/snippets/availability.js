export const serial = (...a) => a.reduce((x, y) => x * y, 1);            // every dependency must be up
export const parallel = (...a) => 1 - a.reduce((x, y) => x * (1 - y), 1); // up if any copy is up (independent failures)

export const downtimeMinutes = (a, days) => (1 - a) * days * 24 * 60;
export const downtimeMinutesPerYear = (a) => downtimeMinutes(a, 365.25);  // average year, leap days included

// serial(0.999, 0.999)          → 0.998 (two 99.9% dependencies give ≈ 99.8%)
// serial(0.999, 0.999, 0.9995)  → 0.9975 (~22 h down per year)
// parallel(0.99, 0.99)          → 0.9999
// downtimeMinutes(0.999, 30)    → 43.2 minutes per 30 days
// downtimeMinutesPerYear(0.999) → 526 minutes ≈ 8.77 h
