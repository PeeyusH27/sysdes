// @display-only: needs an Express `app`, its HTTP `server`, a `ws` server (`wss`) and a pg `pool`
// Graceful shutdown for an HTTP + WebSocket server (extends the source card)
let shuttingDown = false;
app.get('/ready', (_req, res) => res.sendStatus(shuttingDown ? 503 : 200));   // the load balancer's readiness probe

process.on('SIGTERM', () => {
  shuttingDown = true;                                         // readiness → 503: the LB stops sending new requests
  wss?.clients.forEach(c => c.close(1001, 'server restarting'));   // clients reconnect elsewhere (with jitter)
  server.close(() => pool.end().then(() => process.exit(0)));  // wait for in-flight requests, then close the DB pool
  server.closeIdleConnections();                               // drop idle keep-alive sockets now
  setTimeout(() => process.exit(1), 25_000).unref();           // hard stop before the orchestrator's kill timeout
});
