// @display-only: needs the `dataloader` package, a pg pool (`pool`) and a list of `posts`
// Fixes N+1 by batching lookups made in the same tick
import DataLoader from 'dataloader';

const authors = new DataLoader(async ids => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
  const byId = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => byId.get(id) ?? null);           // results must match the order of ids
});
// 1 query for 20 posts' authors instead of 20:
const postAuthors = await Promise.all(posts.map(p => authors.load(p.author_id)));
