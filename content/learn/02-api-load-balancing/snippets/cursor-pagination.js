// @display-only: needs an Express app (`app`) and a pg pool (`pool`)
// Stable pages even while new rows arrive
const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
const decode = s => JSON.parse(Buffer.from(s, 'base64url').toString());

app.get('/api/posts', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const cursor = req.query.cursor ? decode(req.query.cursor) : null;      // { id } of the last item seen
  const { rows } = await pool.query(
    `SELECT id, title, created_at FROM posts
     WHERE ($1::bigint IS NULL OR id < $1)
     ORDER BY id DESC LIMIT $2`,                                         // ids are time-ordered (bigserial / Snowflake)
    [cursor?.id ?? null, limit + 1]);                                    // one extra row tells us if there's a next page
  const page = rows.slice(0, limit);
  res.json({ data: page, nextCursor: rows.length > limit ? encode({ id: page.at(-1).id }) : null });
});
