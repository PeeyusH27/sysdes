// @display-only: needs an Express `app`, a pg-promise `db` and a `validateOrder` function
// Write path: validate, write the order AND the event in one transaction, respond. Consumers do the rest.
app.post('/orders', async (req, res) => {
  const order = validateOrder(req.body);                       // reject bad input before touching the database
  if (!order.ok) return res.status(400).json({ errors: order.errors });
  const id = crypto.randomUUID();
  await db.tx(async t => {                                     // both rows commit, or neither does
    await t.none('INSERT INTO orders(id, user_id, total) VALUES($1, $2, $3)', [id, req.user.id, order.total]);
    await t.none('INSERT INTO outbox(topic, payload) VALUES($1, $2)', ['order.created', { id, total: order.total }]);
  });
  res.status(201).location(`/orders/${id}`).json({ id });     // caches and search are updated from the event
});
