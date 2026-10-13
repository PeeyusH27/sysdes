// Find the nearest available drivers, searching cells ring by ring around the rider.
import { cellSizeM, encode, haversineM, offset } from './geohash.js';

// An in-memory geo index: cell → driver ids, plus each driver's latest fix. In production this is
// Redis GEO (a sorted set scored by a 52-bit geohash), one key per city; the idea is the same.
export class GeoIndex {
  constructor(precision = 6) {
    this.precision = precision;
    this.cells = new Map();                                     // geohash → Set of driver ids
    this.drivers = new Map();                                   // id → { id, lat, lon, ts, cell }
  }

  // A location update. A driver who crosses into another cell must leave the old one,
  // or a search would find them twice, once at a stale position.
  upsert(id, lat, lon, ts) {
    const prev = this.drivers.get(id);
    if (prev && ts <= prev.ts) return false;                    // arrived out of order: keep the newer fix
    const cell = encode(lat, lon, this.precision);
    if (prev?.cell !== cell) {
      if (prev) this.#leave(id, prev.cell);
      if (!this.cells.has(cell)) this.cells.set(cell, new Set());
      this.cells.get(cell).add(id);
    }
    this.drivers.set(id, { id, lat, lon, ts, cell });
    return true;
  }

  remove(id) {                                                  // the driver went offline
    const prev = this.drivers.get(id);
    if (!prev) return;
    this.#leave(id, prev.cell);
    this.drivers.delete(id);
  }

  inCell(cell) {
    return [...(this.cells.get(cell) ?? [])].map(id => this.drivers.get(id));
  }

  #leave(id, cell) {
    const set = this.cells.get(cell);
    set?.delete(id);
    if (set?.size === 0) this.cells.delete(cell);               // don't keep empty cells around
  }
}

// The cells exactly k steps from the centre: a square ring of 1, 8, 16, 24… cells.
export function ringCells(center, k) {
  if (k === 0) return [center];
  const out = new Set();
  for (let d = -k; d <= k; d++) {
    for (const [row, col] of [[k, d], [-k, d], [d, k], [d, -k]]) {
      const cell = offset(center, row, col);
      if (cell) out.add(cell);
    }
  }
  return [...out];
}

// Scan ring 0, ring 1, ring 2… and stop once the `want` best candidates are closer than anything
// left unscanned: after ring k, every unscanned driver is at least k whole cells from the rider.
// So ring 0 alone is never enough (a driver 10 m away may sit across the edge): ring 1 is always read.
export function nearby(index, rider, { want = 5, maxRings = 4, isAvailable = () => true, now = Date.now(), maxAgeMs = 15_000 } = {}) {
  const center = encode(rider.lat, rider.lon, index.precision);
  const { heightM, widthM } = cellSizeM(center);
  const step = Math.min(heightM, widthM);
  const found = [];
  let cellsSearched = 0, examined = 0, k = 0;
  for (; k <= maxRings; k++) {
    for (const cell of ringCells(center, k)) {
      cellsSearched++;
      for (const d of index.inCell(cell)) {
        examined++;
        if (now - d.ts > maxAgeMs || !isAvailable(d.id)) continue;   // stale fix (app offline?) or busy
        found.push({ id: d.id, distanceM: Math.round(haversineM(rider, d)) });
      }
    }
    found.sort((a, b) => a.distanceM - b.distanceM);
    if (found.length >= want && found[want - 1].distanceM <= k * step) break;
  }
  return { candidates: found.slice(0, want), rings: Math.min(k, maxRings) + 1, cellsSearched, examined };
}
