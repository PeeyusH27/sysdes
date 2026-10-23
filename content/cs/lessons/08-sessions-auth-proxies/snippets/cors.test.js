import { test, expect } from 'vitest';
import { cors } from './cors.js';

const config = { allowed: ['https://app.example.com'], methods: ['GET', 'POST', 'PUT'], headers: ['content-type', 'authorization'] };

test('a request from an allowed origin gets its origin echoed back', () => {
  const r = cors({ method: 'GET', origin: 'https://app.example.com' }, config);
  expect(r.headers['access-control-allow-origin']).toBe('https://app.example.com');
  expect(r.headers.vary).toBe('Origin');
});

test('a request from an unknown origin gets no CORS headers, so the browser will not let the script read it', () => {
  expect(cors({ method: 'GET', origin: 'https://evil.example' }, config).headers).toEqual({});
});

test('a preflight for PUT with an authorization header is answered 204 with what is allowed, cached for 10 minutes', () => {
  const r = cors({ method: 'OPTIONS', origin: 'https://app.example.com', requestMethod: 'PUT', requestHeaders: ['Authorization'] }, config);
  expect(r.status).toBe(204);
  expect(r.headers['access-control-allow-methods']).toBe('GET, POST, PUT');
  expect(r.headers['access-control-max-age']).toBe('600');
});

test('a preflight for a method or header we did not allow is refused', () => {
  const origin = 'https://app.example.com';
  expect(cors({ method: 'OPTIONS', origin, requestMethod: 'DELETE' }, config).status).toBe(403);
  expect(cors({ method: 'OPTIONS', origin, requestMethod: 'GET', requestHeaders: ['x-secret'] }, config).status).toBe(403);
});

test('with credentials the header is added, and the origin is still a specific origin, never a wildcard', () => {
  const r = cors({ method: 'GET', origin: 'https://app.example.com' }, { ...config, credentials: true });
  expect(r.headers['access-control-allow-credentials']).toBe('true');
  expect(r.headers['access-control-allow-origin']).not.toBe('*');
});
