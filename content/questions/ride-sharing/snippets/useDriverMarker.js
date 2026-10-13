// Rider's map: follow the matched driver. Fixes arrive every ~4 s; drawing them as they come makes the
// car jump. Instead, glide from where the marker is drawn now to each new fix over one update interval.
import { useEffect, useRef, useState } from 'react';
import { haversineM } from './geohash.js';

// Pure: plan the next glide when a fix arrives. `prev` is the current glide (or null before the first fix).
export function planGlide(prev, fix, now, { gapMs = 4_000, snapM = 500 } = {}) {
  if (prev && !(fix.ts > prev.to.ts)) return prev;            // duplicate or out of order: ignore
  const to = { lat: fix.lat, lon: fix.lon, heading: fix.heading ?? prev?.to.heading ?? 0, ts: fix.ts };
  if (!prev) return { from: to, to, start: now, duration: 0 };  // first fix: just place the car
  const from = markerAt(prev, now);                           // start from what the rider sees: no jump
  if (haversineM(from, to) > snapM) return { from: to, to, start: now, duration: 0 };   // after a long gap, teleport rather than slide through buildings
  return { from, to, start: now, duration: gapMs };
}

// Pure: where to draw the marker at time `now`.
export function markerAt(glide, now) {
  const t = glide.duration > 0 ? Math.min(1, Math.max(0, (now - glide.start) / glide.duration)) : 1;
  return {
    lat: glide.from.lat + (glide.to.lat - glide.from.lat) * t,
    lon: glide.from.lon + (glide.to.lon - glide.from.lon) * t,
    heading: lerpHeading(glide.from.heading, glide.to.heading, t),
  };
}

// Turn the short way round: from 350° to 10° is +20°, not −340°.
export function lerpHeading(a, b, t) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return (((a + d * t) % 360) + 360) % 360;
}

export function useDriverMarker(rideId, wsUrl) {
  const [marker, setMarker] = useState(null);                  // { lat, lon, heading }, or null before the first fix
  const glide = useRef(null);

  useEffect(() => {
    let ws, raf = 0, retry, attempt = 0, closed = false;
    const frame = now => {
      const g = glide.current;
      // Re-render only while a glide is running. With a map SDK, call marker.setPosition() here instead.
      if (g && now <= g.start + g.duration + 100) setMarker(markerAt(g, now));
      raf = requestAnimationFrame(frame);
    };
    const connect = () => {
      ws = new WebSocket(`${wsUrl}?ride=${encodeURIComponent(rideId)}`);
      ws.onopen = () => { attempt = 0; };                      // the server sends the latest fix first
      ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'driver_location') glide.current = planGlide(glide.current, msg, performance.now());
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, Math.random() * Math.min(30_000, 1_000 * 2 ** attempt++));   // full jitter
      };
    };
    connect();
    raf = requestAnimationFrame(frame);
    return () => {
      closed = true;
      clearTimeout(retry);
      cancelAnimationFrame(raf);
      ws?.close();
    };
  }, [rideId, wsUrl]);

  return marker;
}
