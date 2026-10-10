// Relational (PostgreSQL): stock and the order change together or not at all.
// Decrement stock first; if no row changed, the item is out of stock, so roll back instead of creating an order
export class OutOfStockError extends Error {
  constructor(sku) { super(`out of stock: ${sku}`); this.name = 'OutOfStockError'; this.sku = sku; }
}

export async function placeOrder(pool, { userId, sku, qty, total }) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rowCount } = await c.query('UPDATE stock SET qty = qty - $2 WHERE sku = $1 AND qty >= $2', [sku, qty]);
    if (rowCount === 0) throw new OutOfStockError(sku);
    await c.query('INSERT INTO orders (user_id, sku, qty, total) VALUES ($1, $2, $3, $4)', [userId, sku, qty, total]);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
