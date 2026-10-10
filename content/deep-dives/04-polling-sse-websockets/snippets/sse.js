// @display-only: needs an Express `app`, an event `bus` and `eventsAfter(id)` from your event store
// SSE server with resume (Last-Event-ID) and heartbeats (the source had neither)
app.get('/stream', async (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });  // nginx: don't buffer
  res.flushHeaders();
  res.write(`retry: ${2_000 + Math.floor(Math.random() * 3_000)}\n\n`);   // reconnect delay, jittered per client

  let lastId = Number(req.get('Last-Event-ID') ?? 0);         // EventSource sends it on every reconnect
  const send = ev => {
    if (ev.id <= lastId) return;                              // already sent: replay and live can overlap
    lastId = ev.id;
    res.write(`id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.data)}\n\n`);
  };
  let pending = [];                                           // live events that arrive during the replay
  const unsubscribe = bus.subscribe(ev => (pending ? pending.push(ev) : send(ev)));   // subscribe first…
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);   // comment lines keep idle proxies open
  res.on('close', () => { clearInterval(ping); unsubscribe(); });

  (await eventsAfter(lastId)).forEach(send);                  // …replay what was missed while disconnected…
  pending.forEach(send);                                      // …then what arrived meanwhile
  pending = null;                                             // from now on, go live
});

// Browser: EventSource reconnects by itself and sends Last-Event-ID automatically
const es = new EventSource('/stream');
es.addEventListener('score', e => renderScore(JSON.parse(e.data)));
