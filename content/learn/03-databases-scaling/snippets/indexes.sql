-- A composite index follows the leftmost-prefix rule
CREATE INDEX CONCURRENTLY orders_user_created ON orders (user_id, created_at DESC);
-- uses it fully:          WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
-- uses the prefix:        WHERE user_id = $1 AND status = 'paid'
-- generally can't use it: WHERE created_at > now() - interval '1 day'   (no user_id)
EXPLAIN ANALYZE SELECT id, total FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;

-- Covering (replaces the first index): id and total are stored in the index,
-- so the query above can run as an index-only scan without reading the table
CREATE INDEX CONCURRENTLY orders_user_created_cov ON orders (user_id, created_at DESC) INCLUDE (id, total);

-- Partial: index only the rows you actually query (small, cheap to maintain)
CREATE INDEX CONCURRENTLY orders_pending ON orders (created_at) WHERE status = 'pending';
