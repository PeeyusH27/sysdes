// Great-circle distance in kilometres, and the box that contains a circle. Both indexes use these:
// the index finds candidates cheaply; the exact distance check throws away the ones in the corners.
const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LAT = (Math.PI * EARTH_RADIUS_KM) / 180;       // about 111.19

const rad = (d) => (d * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Smallest lat/lon rectangle that holds every point within `radiusKm` of the centre.
// (Ignores the poles and the date line; a real service handles those as special cases.)
export function boundingBox(lat, lon, radiusKm) {
  const dLat = radiusKm / KM_PER_DEGREE_LAT;
  const dLon = radiusKm / (KM_PER_DEGREE_LAT * Math.cos(rad(lat)));
  return { latLo: lat - dLat, latHi: lat + dLat, lonLo: lon - dLon, lonHi: lon + dLon };
}

export { KM_PER_DEGREE_LAT };
