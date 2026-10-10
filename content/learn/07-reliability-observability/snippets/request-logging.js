// @display-only: needs an Express `app` and the pino logger
// Structured logs with a request id that follows the request everywhere
import pino from 'pino';
import { randomUUID } from 'node:crypto';
const log = pino();

app.use((req, res, next) => {
  req.id = req.get('x-request-id') ?? randomUUID();          // reuse the caller's id so logs join up across services
  req.log = log.child({ reqId: req.id, route: req.path });
  const start = performance.now();
  res.set('x-request-id', req.id);
  res.on('finish', () => req.log.info({ status: res.statusCode, ms: Math.round(performance.now() - start) }, 'request'));
  next();
});
