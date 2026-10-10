// @display-only: needs an Express `app` and getProduct (cache-aside: Redis, then the database)
// Read path: CDN first, then cache, then database. Each layer absorbs traffic.
app.get('/products/:id', async (req, res) => {
  const product = await getProduct(req.params.id);   // Redis hit in ~1 ms, or the DB on a miss
  if (!product) return res.sendStatus(404);
  res.set('Cache-Control', 'public, max-age=60');     // CDN and browser may reuse it for 60 s
  res.json(product);
});
