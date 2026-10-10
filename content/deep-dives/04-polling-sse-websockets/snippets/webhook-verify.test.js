import { createHmac } from 'node:crypto';
import { expect, test } from 'vitest';
import { verifyWebhook } from './webhook-verify.js';

const secret = 'whsec_test';
const rawBody = Buffer.from('{"id":"evt_42","type":"payment.succeeded"}');
const timestamp = '1700000000';
const sign = (body, ts = timestamp, key = secret) => createHmac('sha256', key).update(`${ts}.`).update(body).digest('hex');
const base = { rawBody, timestamp, signature: sign(rawBody), secret, nowSec: 1_700_000_060 };

test('accepts a correctly signed, fresh delivery', () => {
  expect(verifyWebhook(base)).toBe(true);
});

test('rejects a tampered body or a wrong secret', () => {
  expect(verifyWebhook({ ...base, rawBody: Buffer.from('{"id":"evt_42","type":"refund"}') })).toBe(false);
  expect(verifyWebhook({ ...base, signature: sign(rawBody, timestamp, 'other') })).toBe(false);
});

test('rejects malformed or missing signatures without throwing', () => {
  expect(verifyWebhook({ ...base, signature: 'abc' })).toBe(false);
  expect(verifyWebhook({ ...base, signature: undefined })).toBe(false);
});

test('rejects old timestamps (replays) and timestamps that were changed', () => {
  expect(verifyWebhook({ ...base, nowSec: 1_700_000_000 + 301 })).toBe(false);
  expect(verifyWebhook({ ...base, timestamp: '1700000050' })).toBe(false);   // signature covered the old one
  expect(verifyWebhook({ ...base, timestamp: undefined })).toBe(false);
});
