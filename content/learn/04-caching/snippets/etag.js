// @display-only: Express app + getProduct from above.
// Express already adds weak ETags automatically; this shows the mechanism.
import { createHash } from 'node:crypto';

app.get('/api/products/:id', async (req, res) => {
  const product = await getProduct(req.params.id);
  if (!product) return res.sendStatus(404);
  const body = JSON.stringify(product);
  const etag = `"${createHash('sha1').update(body).digest('base64url')}"`;
  res.set({ ETag: etag, 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
  if (req.get('If-None-Match') === etag) return res.sendStatus(304);   // the client's copy is still valid
  res.type('json').send(body);
});
