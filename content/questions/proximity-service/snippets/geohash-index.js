// "Businesses near me" with a geohash column. In SQL this is an ordinary indexed string:
//   SELECT id FROM business WHERE geohash LIKE '9q8yy%'     -- a range scan on a B-tree
// Pick a cell size close to the search radius, scan the few cells that cover the circle, then check exact distances.
import { KM_PER_DEGREE_LAT, boundingBox, haversineKm } from './distance.js';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encode(lat, lon, precision = 9) {
  let latLo = -90, latHi = 90, lonLo = -180, lonHi = 180, ch = 0, bits = 0, isLon = true, out = '';
  while (out.length < precision) {
    if (isLon) { const m = (lonLo + lonHi) / 2; if (lon >= m) { ch = ch * 2 + 1; lonLo = m; } else { ch *= 2; lonHi = m; } }
    else { const m = (latLo + latHi) / 2; if (lat >= m) { ch = ch * 2 + 1; latLo = m; } else { ch *= 2; latHi = m; } }
    isLon = !isLon;
    if (++bits === 5) { out += BASE32[ch]; ch = 0; bits = 0; }
  }
  return out;
}

// Size of a cell with this many characters, in degrees. Longitude gets the extra bit when the bit count is odd.
export function cellDegrees(precision) {
  const lonBits = Math.ceil((5 * precision) / 2);
  const latBits = Math.floor((5 * precision) / 2);
  return { lat: 180 / 2 ** latBits, lon: 360 / 2 ** lonBits };
}

// Largest precision (smallest cell) whose cells are still at least `radiusKm` tall and wide at this latitude.
// Then the circle can touch at most 3 cells in each direction: 9 cells.
export function precisionFor(radiusKm, lat) {
  for (let p = 9; p >= 1; p--) {
    const d = cellDegrees(p);
    const height = d.lat * KM_PER_DEGREE_LAT;
    const width = d.lon * KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);
    if (height >= radiusKm && width >= radiusKm) return p;
  }
  return 1;
}

// The geohash prefixes whose cells cover the circle.
export function coveringCells(lat, lon, radiusKm) {
  const p = precisionFor(radiusKm, lat);
  const d = cellDegrees(p);
  const box = boundingBox(lat, lon, radiusKm);
  const cells = new Set();
  for (let la = box.latLo; ; la += d.lat) {
    const y = Math.min(la, box.latHi);
    for (let lo = box.lonLo; ; lo += d.lon) {
      const x = Math.min(lo, box.lonHi);
      cells.add(encode(Math.max(-90, Math.min(89.999999, y)), x, p));
      if (x >= box.lonHi) break;
    }
    if (y >= box.latHi) break;
  }
  return { precision: p, cells: [...cells] };
}

export class GeohashIndex {
  #rows = [];                                   // sorted [{ hash, biz }], like a B-tree on the geohash column

  constructor(businesses) {
    this.#rows = businesses.map((b) => ({ hash: encode(b.lat, b.lon, 9), biz: b })).sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  }

  // First row whose hash is >= the prefix: the start of a LIKE 'prefix%' range scan.
  #lowerBound(prefix) {
    let lo = 0, hi = this.#rows.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.#rows[mid].hash < prefix) lo = mid + 1; else hi = mid; }
    return lo;
  }

  nearby(lat, lon, radiusKm, limit = 20) {
    const { cells } = coveringCells(lat, lon, radiusKm);
    const found = [];
    let scanned = 0;
    for (const cell of cells) {
      for (let i = this.#lowerBound(cell); i < this.#rows.length && this.#rows[i].hash.startsWith(cell); i++) {
        scanned++;
        const dist = haversineKm({ lat, lon }, this.#rows[i].biz);
        if (dist <= radiusKm) found.push({ ...this.#rows[i].biz, distKm: dist });
      }
    }
    found.sort((a, b) => a.distKm - b.distKm);
    return { results: found.slice(0, limit), scanned, cells: cells.length };
  }
}
