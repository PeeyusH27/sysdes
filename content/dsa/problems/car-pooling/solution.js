function carPooling(trips, capacity) {
  const change = new Array(1001).fill(0); // change[x] = passengers getting in minus getting out at stop x
  for (const [passengers, from, to] of trips) {
    change[from] += passengers;
    change[to] -= passengers; // out of the car from stop `to` onwards
  }
  let load = 0;
  for (let stop = 0; stop < change.length; stop++) {
    load += change[stop]; // running sum = passengers in the car after this stop
    if (load > capacity) return false;
  }
  return true;
}
