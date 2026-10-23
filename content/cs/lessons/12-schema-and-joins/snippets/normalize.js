// Denormalized: every order repeats its customer's name and city.
// Normalized: the customer is stored once and orders point at it with customerId.
export function normalize(flatOrders) {
  const customers = new Map();
  const orders = flatOrders.map(({ id, customerId, name, city, total }) => {
    customers.set(customerId, { name, city }); // the last row seen wins, which is exactly the drift problem
    return { id, customerId, total };
  });
  return { customers, orders };
}

// Customers whose orders disagree about their own city: the update anomaly, found after the fact.
export function inconsistentCustomers(flatOrders) {
  const cities = new Map();
  for (const o of flatOrders) {
    if (!cities.has(o.customerId)) cities.set(o.customerId, new Set());
    cities.get(o.customerId).add(o.city);
  }
  return [...cities].filter(([, set]) => set.size > 1).map(([id]) => id);
}
