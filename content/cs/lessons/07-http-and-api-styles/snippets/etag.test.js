import { test, expect } from 'vitest';
import { etagOf, respond } from './etag.js';

test('the first request gets the body, an ETag and a freshness lifetime', () => {
  const r = respond('{"price":10}');
  expect(r.status).toBe(200);
  expect(r.body).toBe('{"price":10}');
  expect(r.headers['cache-control']).toBe('max-age=60');
});

test('a repeat request with the same ETag gets 304 and no body', () => {
  const first = respond('{"price":10}');
  const again = respond('{"price":10}', { 'if-none-match': first.headers.etag });
  expect(again.status).toBe(304);
  expect(again.body).toBeUndefined();
});

test('when the data changes the old ETag no longer matches and the new body is sent', () => {
  const old = respond('{"price":10}');
  const next = respond('{"price":12}', { 'if-none-match': old.headers.etag });
  expect(next.status).toBe(200);
  expect(next.headers.etag).not.toBe(old.headers.etag);
});

test('the same body always gives the same ETag', () => {
  expect(etagOf('x')).toBe(etagOf('x'));
  expect(etagOf('x')).not.toBe(etagOf('y'));
});
