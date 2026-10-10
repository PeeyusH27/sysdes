// @display-only: needs ws, ioredis, an HTTP server, MongoDB collections (db) and authenticate/isMember/membersOf helpers
// WebSocket gateway. Any node can hold any user's sockets; Redis pub/sub routes between nodes.
import { WebSocketServer } from 'ws';
import Redis from 'ioredis';

const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);                     // a subscribed connection can't run other commands
const local = new Map();                                          // userId -> Set<WebSocket> on this node
const wss = new WebSocketServer({ noServer: true });

// Authenticate during the HTTP upgrade, so no message can arrive before we know who's talking
httpServer.on('upgrade', async (req, socket, head) => {
  const userId = await authenticate(req).catch(() => null);       // e.g. verify the session cookie
  if (!userId) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy(); }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req, userId));
});

sub.on('message', (channel, payload) => {
  for (const ws of local.get(channel.slice('user:'.length)) ?? []) ws.send(payload);
});

wss.on('connection', (ws, _req, userId) => {
  let mine = local.get(userId);
  if (!mine) { local.set(userId, (mine = new Set())); sub.subscribe(`user:${userId}`).catch(console.error); }
  mine.add(ws);

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const handler = { send: onSend, sync: onSync, read: onRead }[m.type];
    handler?.(ws, userId, m).catch(() => ws.send(JSON.stringify({ type: 'error', clientId: m.clientId })));
  });
  ws.on('close', () => {
    mine.delete(ws);
    if (mine.size === 0) { local.delete(userId); sub.unsubscribe(`user:${userId}`).catch(console.error); }
  });
});

async function broadcast(conversationId, event) {
  const payload = JSON.stringify(event);
  await Promise.all((await membersOf(conversationId)).map(m => pub.publish(`user:${m}`, payload)));
}

async function onSend(ws, userId, { clientId, conversationId, text }) {
  if (!(await isMember(userId, conversationId))) throw new Error('not a member');
  const ack = seq => ws.send(JSON.stringify({ type: 'ack', clientId, seq }));
  const existing = await db.messages.findOne({ from: userId, clientId });
  if (existing) return ack(existing.seq);                         // a retry: already stored, just ack again
  const seq = await pub.incr(`seq:${conversationId}`);            // per-conversation order
  const msg = { conversationId, seq, from: userId, clientId, text, ts: Date.now() };
  try {
    await db.messages.insertOne(msg);
  } catch (e) {
    if (e.code !== 11000) throw e;                                // duplicate key: a concurrent retry won the race
    return ack((await db.messages.findOne({ from: userId, clientId })).seq);
  }
  ack(seq);                                                       // ack only once the message is durable
  await broadcast(conversationId, { type: 'message', ...msg });   // offline members get a push from a separate consumer
}

async function onSync(ws, userId, { conversationId, after = 0 }) {
  if (!(await isMember(userId, conversationId))) throw new Error('not a member');
  const missed = await db.messages.find({ conversationId, seq: { $gt: after } }).sort({ seq: 1 }).limit(500).toArray();
  for (const m of missed) ws.send(JSON.stringify({ type: 'message', ...m }));
}

async function onRead(_ws, userId, { conversationId, seq }) {
  const r = await db.members.updateOne(
    { conversationId, userId, lastReadSeq: { $lt: seq } },        // watermarks only move forward
    { $set: { lastReadSeq: seq } });
  if (r.modifiedCount) await broadcast(conversationId, { type: 'receipt', conversationId, userId, readUpTo: seq });
}
