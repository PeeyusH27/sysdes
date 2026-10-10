// @display-only: needs an Express 5 `app` and two downstream services (USERS_URL, PRICING_URL)
// Deadlines: give the whole request a budget and pass what's left downstream
app.use((req, _res, next) => {
  const fromCaller = Number(req.get('x-deadline-ms')) || Infinity;   // an upstream service may have less time left
  req.deadline = Date.now() + Math.min(2_000, fromCaller);
  next();
});
const remaining = req => Math.max(0, req.deadline - Date.now());

app.get('/checkout', async (req, res) => {
  const user = await fetch(`${USERS_URL}/${req.userId}`, { signal: AbortSignal.timeout(Math.min(500, remaining(req))) }).then(r => r.json());
  const quote = await fetch(`${PRICING_URL}/quote`, {
    method: 'POST', body: JSON.stringify(user.cart),
    headers: { 'Content-Type': 'application/json', 'x-deadline-ms': String(remaining(req)) },   // downstream can give up early too
    signal: AbortSignal.timeout(remaining(req)),
  });
  res.json(await quote.json());
});

// A timed-out dependency becomes a fast 504 instead of a hung request
app.use((err, _req, res, _next) => res.status(err.name === 'TimeoutError' ? 504 : 500).end());
