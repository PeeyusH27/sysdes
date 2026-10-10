// @display-only: needs an Express `app` and an ioredis client (`redis`)
// One Redis subscription per instance, fanned out to every viewer on that instance
const viewers = new Map();                                            // showId -> Set<res>
const sub = redis.duplicate();
await sub.psubscribe('show:*:seats');
sub.on('pmessage', (_pattern, channel, msg) => {
  for (const res of viewers.get(channel.split(':')[1]) ?? []) res.write(`data: ${msg}\n\n`);
});

app.get('/shows/:id/seats/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }).flushHeaders();
  const set = viewers.get(req.params.id) ?? new Set();
  viewers.set(req.params.id, set.add(res));
  req.on('close', () => set.delete(res));
});
