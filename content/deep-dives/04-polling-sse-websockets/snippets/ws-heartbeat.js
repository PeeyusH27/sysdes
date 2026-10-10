// @display-only: needs a `ws` WebSocketServer (`wss`) and a `broadcast` helper
// Server heartbeat: ping every 30 s and drop peers that didn't answer the previous ping
wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', m => broadcast(m));
});

setInterval(() => {
  wss.clients.forEach(c => {
    if (!c.isAlive) return c.terminate();          // no pong in 30 s: laptop asleep, NAT entry gone, cable pulled
    c.isAlive = false;
    c.ping();
  });
}, 30_000);                                        // shorter than proxy/LB idle timeouts (often 60 s)
