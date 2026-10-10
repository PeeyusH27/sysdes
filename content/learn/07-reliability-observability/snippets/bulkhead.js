// Cap concurrent calls per dependency; when a call finishes, hand its slot to the next waiter
export function bulkhead(limit, maxQueue = 100) {
  let active = 0;
  const waiting = [];
  return async (fn) => {
    if (active < limit) active++;
    else if (waiting.length < maxQueue) await new Promise((resolve) => waiting.push(resolve));
    else throw new Error('bulkhead full');                  // shed load instead of queueing forever
    try {
      return await fn();
    } finally {
      const next = waiting.shift();
      if (next) next();                                     // hand over the slot directly, so the limit is never exceeded
      else active--;
    }
  };
}
// const payments = bulkhead(20); await payments(() => paymentsApi.charge(order));
