// @display-only: needs an Express `app`, an event `bus` and `eventsAfter(id)` from your event store
// Long polling server: subscribe first, then read the backlog, so no event slips through the gap.
app.get('/events', async (req, res) => {
  const since = Number(req.query.since ?? 0);
  let done = false, early = [];                               // live events that arrive while the backlog loads
  const finish = events => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    unsubscribe();
    if (!events) return;                                      // the client went away: just clean up
    if (!events.length) return res.sendStatus(204);           // no news in 30 s: the client asks again
    res.json({ events, cursor: events.at(-1).id });
  };
  const unsubscribe = bus.subscribe(ev => (early ? early.push(ev) : finish([ev])));   // 1. subscribe…
  const timer = setTimeout(() => finish([]), 30_000);
  res.on('close', () => finish());                            // res, not req: req 'close' fires once the request is read

  const backlog = await eventsAfter(since);                   // 2. …then read what was missed
  const last = backlog.at(-1)?.id ?? since;
  const events = [...backlog, ...early.filter(ev => ev.id > last)];   // an event in both lists is sent once
  early = null;                                               // from now on, answer with the next live event
  if (events.length) finish(events);
});
