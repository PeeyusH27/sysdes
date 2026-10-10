// Pool sizing arithmetic. Every instance opens its own pool, so the TOTAL must fit under the database limit.
export function poolMaxPerInstance({ maxConnections, reserved = 20, instances }) {
  return Math.floor((maxConnections - reserved) / instances);   // keep `reserved` for admin, migrations, cron
}

// PostgreSQL wiki heuristic for connections doing useful work at once: (cores × 2) + effective spindles
export function activeConnectionTarget({ cores, spindles = 1 }) {
  return cores * 2 + spindles;
}

// Little's law: connections busy on average = queries per second × seconds each query holds one
export function busyConnections({ qps, holdMs }) {
  return (qps * holdMs) / 1_000;
}
