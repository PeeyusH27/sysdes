// @display-only: needs an Express 5 app (`app`), `rateLimit` middleware, Redis (`redis`), Postgres (`pool`) and a queue client (`queue`)
// Express 5 forwards rejected promises to the error handler
import { shortCode } from './scramble.js';
import { nextId } from './range-allocator.js';

app.post('/api/urls', rateLimit, async (req, res) => {
  const url = new URL(req.body.longUrl);                     // throws on garbage → 400 from the error handler
  if (!['http:', 'https:'].includes(url.protocol)) return res.status(400).json({ error: 'Only http(s) URLs' });
  const code = req.body.alias ?? shortCode(await nextId(redis));
  try {
    await pool.query('INSERT INTO urls (code, long_url, user_id, expires_at) VALUES ($1, $2, $3, $4)',
      [code, url.href, req.user?.id ?? null, req.body.expiresAt ?? null]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Alias already taken' });   // unique_violation
    throw e;
  }
  res.status(201).json({ code, shortUrl: `https://short.example/${code}` });
});

app.get('/:code', async (req, res) => {
  const { code } = req.params;
  let longUrl = await redis.get(`u:${code}`);
  if (!longUrl) {
    const { rows } = await pool.query(
      'SELECT long_url, expires_at FROM urls WHERE code = $1 AND (expires_at IS NULL OR expires_at > now())', [code]);
    if (!rows.length) return res.sendStatus(404);
    longUrl = rows[0].long_url;
    const ttl = rows[0].expires_at ? Math.min(86_400, Math.floor((rows[0].expires_at - Date.now()) / 1000)) : 86_400;
    if (ttl > 0) await redis.set(`u:${code}`, longUrl, 'EX', ttl);   // never cache past the link's expiry
  }
  queue.publish('clicks', { code, ts: Date.now(), ref: req.get('referer') }).catch(() => {});   // never block the redirect
  res.redirect(302, longUrl);                                // 301 if per-click analytics don't matter
});
