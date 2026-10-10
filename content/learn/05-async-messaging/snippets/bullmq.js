// @display-only: needs Redis (BullMQ stores jobs there) and a `sendWelcomeEmail` function
// A Redis-backed job queue with retries, backoff and dedupe at enqueue
import { Queue, Worker } from 'bullmq';
const connection = { host: 'localhost', port: 6379 };

export const emails = new Queue('emails', { connection });

await emails.add('welcome', { userId: 42 }, {
  jobId: 'welcome:42',                               // adding the same jobId again is a no-op
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 },    // retries after 1 s, 2 s, 4 s, 8 s
  removeOnComplete: 1_000,
});

new Worker('emails', async (job) => {
  await sendWelcomeEmail(job.data.userId);           // throwing marks the attempt failed; after 5 it lands in "failed"
}, { connection, concurrency: 10 });
