// Geohash: split the world in half again and again, alternating longitude and latitude,
// and write the bits 5 at a time in base 32. Each extra character makes the cell 32× smaller,
// and points that share a prefix are in the same cell.
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';   // no a, i, l, o
const EARTH_RADIUS_M = 6_371_000;

export function encode(lat, lon, precision = 6) {
  let latLo = -90, latHi = 90, lonLo = -180, lonHi = 180;
  let hash = '', ch = 0, bits = 0, lonBit = true;          // the first bit is longitude
  while (hash.length < precision) {
    if (lonBit) {
      const mid = (lonLo + lonHi) / 2;
      if (lon >= mid) { ch = ch * 2 + 1; lonLo = mid; } else { ch *= 2; lonHi = mid; }
    } else {
      const mid = (latLo + latHi) / 2;
      if (lat >= mid) { ch = ch * 2 + 1; latLo = mid; } else { ch *= 2; latHi = mid; }
    }
    lonBit = !lonBit;
    if (++bits === 5) { hash += BASE32[ch]; ch = 0; bits = 0; }
  }
  return hash;
}

// The cell's bounding box: replay the same halvings.
export function bounds(hash) {
  let latLo = -90, latHi = 90, lonLo = -180, lonHi = 180, lonBit = true;
  for (const c of hash) {
    const v = BASE32.indexOf(c);
    if (v < 0) throw new Error(`Not a geohash character: ${c}`);
    for (let b = 4; b >= 0; b--) {
      const bit = (v >> b) & 1;
      if (lonBit) { const mid = (lonLo + lonHi) / 2; if (bit) lonLo = mid; else lonHi = mid; }
      else { const mid = (latLo + latHi) / 2; if (bit) latLo = mid; else latHi = mid; }
      lonBit = !lonBit;
    }
  }
  return { latLo, latHi, lonLo, lonHi };
}

// The cell dRow rows north and dCol columns east of this one, at the same precision.
// Cells of one precision form a regular grid, so stepping from the centre lands in the middle of the target.
export function offset(hash, dRow, dCol) {
  const b = bounds(hash);
  const lat = (b.latLo + b.latHi) / 2 + dRow * (b.latHi - b.latLo);
  if (lat > 90 || lat < -90) return null;                    // past a pole
  const lon = (b.lonLo + b.lonHi) / 2 + dCol * (b.lonHi - b.lonLo);
  return encode(lat, ((lon + 540) % 360) - 180, hash.length); // wrap across the antimeridian
}

// The 8 cells around this one. A query must look at them too: a driver 10 m away can sit across an edge.
export function neighbours(hash) {
  return {
    n: offset(hash, 1, 0), ne: offset(hash, 1, 1), e: offset(hash, 0, 1), se: offset(hash, -1, 1),
    s: offset(hash, -1, 0), sw: offset(hash, -1, -1), w: offset(hash, 0, -1), nw: offset(hash, 1, -1),
  };
}

// Great-circle distance in metres.
export function haversineM(a, b) {
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Cell height and width in metres. Width shrinks with cos(latitude): cells get narrow near the poles.
export function cellSizeM(hash) {
  const b = bounds(hash);
  const lat = (b.latLo + b.latHi) / 2, lon = (b.lonLo + b.lonHi) / 2;
  return {
    heightM: haversineM({ lat: b.latLo, lon }, { lat: b.latHi, lon }),
    widthM: haversineM({ lat, lon: b.lonLo }, { lat, lon: b.lonHi }),
  };
}
