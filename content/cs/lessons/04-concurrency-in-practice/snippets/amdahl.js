// Amdahl's law: if a fraction p of the work can run in parallel, n workers give this speedup.
export const speedup = (p, n) => 1 / (1 - p + p / n);

// With unlimited workers only the serial part is left.
export const limit = (p) => 1 / (1 - p);
