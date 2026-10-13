// @display-only: needs Redis and a WebSocket server
// Driver location ingest. At ~1.25M updates/s nothing here touches a durable database:
// the latest fix lives in Redis, and history goes to Kafka in batches.
import { WebSocketServer } from 'ws';

const FRESH_S = 15;                    // no fix for 15 s → the live record expires and matching skips the driver
const SAMPLE_MS = 30_000;              // off trip, keep one history point per driver every 30 s
const FLUSH_MS = 200;

export function startIngest({ server, redis, producer, authenticate }) {
  const wss = new WebSocketServer({ noServer: true });
  let history = [];
  setInterval(() => {
    if (!history.length) return;
    const messages = history;
    history = [];
    producer.send({ topic: 'driver-locations', messages }).catch(() => {});   // analytics: losing a batch is tolerable
  }, FLUSH_MS);

  // Authenticate during the HTTP upgrade, so no frame is processed for an unknown driver.
  server.on('upgrade', async (req, socket, head) => {
    const driver = await authenticate(req);                     // { id, city } from a short-lived token
    if (!driver) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => onDriver(ws, driver));
  });

  function onDriver(ws, { id, city }) {
    let lastTs = 0, lastSample = 0;
    ws.on('message', async raw => {
      let m;
      try { m = JSON.parse(raw); } catch { return; }
      if (m.type === 'offline') return redis.zRem(`geo:{${city}}`, id);
      if (m.type !== 'location' || !(m.ts > lastTs) || Math.abs(m.lat) > 90 || Math.abs(m.lon) > 180) return;
      lastTs = m.ts;                                            // drop duplicates and out-of-order fixes

      // One round trip. GEOADD on an existing member overwrites its geohash score, so a driver who
      // crossed into another cell leaves the old one automatically.
      const [, , , [state, rideId]] = await redis.multi()
        .geoAdd(`geo:{${city}}`, { longitude: m.lon, latitude: m.lat, member: id })
        .hSet(`loc:${id}`, { lat: m.lat, lon: m.lon, heading: m.heading ?? 0, ts: m.ts })
        .expire(`loc:${id}`, FRESH_S)
        .hmGet(`drv:${id}`, ['state', 'rideId'])
        .exec();

      // On a trip, the rider is watching: forward every fix to the ride's channel, where the
      // gateway holding the rider's socket is subscribed.
      if (state === 'ON_TRIP' && rideId) {
        redis.publish(`ride:${rideId}`, JSON.stringify({ type: 'driver_location', lat: m.lat, lon: m.lon, heading: m.heading, ts: m.ts }));
      }
      // History: every point during a trip (fares, disputes), a sample otherwise. Keyed by driver so
      // one driver's points stay in order in one partition.
      if (state === 'ON_TRIP' || m.ts - lastSample >= SAMPLE_MS) {
        lastSample = m.ts;
        history.push({ key: id, value: JSON.stringify({ id, city, lat: m.lat, lon: m.lon, ts: m.ts, state }) });
      }
    });
    // A dropped socket doesn't take the driver offline at once: a tunnel is not a shift ending.
    // If no fix arrives for FRESH_S, loc:<id> expires and a sweeper removes the driver from geo:{city}.
  }
}
