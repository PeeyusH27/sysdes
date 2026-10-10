// @display-only: needs an Express app (`app`), its HTTP server (`server`) and a pg pool (`pool`)
// Liveness vs readiness, plus draining on deploy
let shuttingDown = false;
app.get('/livez', (_req, res) => res.sendStatus(200));                   // the process is alive
app.get('/readyz', async (_req, res) => {                                // should the LB send traffic here?
  if (shuttingDown) return res.sendStatus(503);
  try { await pool.query('SELECT 1'); res.sendStatus(200); }
  catch { res.sendStatus(503); }
});
process.on('SIGTERM', () => {
  shuttingDown = true;                                                   // readiness fails, so the LB stops routing here
  setTimeout(() => server.close(() => process.exit(0)), 10_000);         // finish in-flight requests, then exit
});
