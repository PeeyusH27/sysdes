// @display-only: needs an Express `app`, BullMQ and a Redis `connection`
// Async path: 202 + Location, a status endpoint, and a worker with retries (BullMQ)
import { Queue, Worker } from 'bullmq';

const reports = new Queue('reports', { connection });

app.post('/reports', async (req, res) => {
  const job = await reports.add('build', req.body, { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } });
  res.status(202).location(`/reports/${job.id}`).json({ jobId: job.id });
});

app.get('/reports/:id', async (req, res) => {
  const job = await reports.getJob(req.params.id);
  if (!job) return res.sendStatus(404);
  const state = await job.getState();                    // waiting | active | completed | failed | delayed
  res.json({ state, progress: job.progress, result: state === 'completed' ? job.returnvalue : undefined });
});

new Worker('reports', async job => {
  const rows = await loadRows(job.data);
  await job.updateProgress(50);
  return { url: await renderAndUpload(rows) };           // stored as job.returnvalue
}, { connection });                                      // after 3 failed attempts the job stays in the failed set (the DLQ)
