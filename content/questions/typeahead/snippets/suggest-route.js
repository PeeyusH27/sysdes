// @display-only: needs an Express app (`app`) and a Trie built from query logs (`trie`)
// suggest-route.js: popular prefixes are served from the CDN
app.get('/api/suggest', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase().slice(0, 50);   // normalise: one cache key per prefix
  const limit = Math.min(Number(req.query.limit) || 8, 8);
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.json({ q, items: trie.suggest(q).slice(0, limit).map((label, i) => ({ id: `${q}:${i}`, label })) });
});
