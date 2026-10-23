import { test, expect } from 'vitest';
import { issue, verify } from './jwt.js';

const secret = 'server-secret';
const now = 1_700_000_000_000;

test('a token we issued verifies and returns its claims', () => {
  const token = issue({ sub: 'user-42', role: 'admin' }, secret, { now });
  expect(verify(token, secret, { now })).toMatchObject({ sub: 'user-42', role: 'admin' });
});

test('the payload is readable by anyone: signed, not secret', () => {
  const token = issue({ sub: 'user-42' }, secret, { now });
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  expect(claims.sub).toBe('user-42');
});

test('changing the payload without the secret breaks the signature', () => {
  const [h, , s] = issue({ sub: 'user-42', role: 'user' }, secret, { now }).split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'user-42', role: 'admin', exp: 9_999_999_999 })).toString('base64url');
  expect(() => verify(`${h}.${forged}.${s}`, secret, { now })).toThrow('bad signature');
});

test('a token signed with another secret is rejected', () => {
  expect(() => verify(issue({ sub: 'x' }, 'other', { now }), secret, { now })).toThrow('bad signature');
});

test('an expired token is rejected, which is the only way to end it early without a server-side list', () => {
  const token = issue({ sub: 'user-42' }, secret, { now, ttlSeconds: 900 });
  expect(() => verify(token, secret, { now: now + 901_000 })).toThrow('expired');
  expect(verify(token, secret, { now: now + 899_000 }).sub).toBe('user-42');
});

test('alg none is refused: the server decides how to verify, not the token', () => {
  const none = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9_999_999_999 })).toString('base64url');
  expect(() => verify(`${none}.${payload}.x`, secret, { now })).toThrow('unexpected algorithm');
});
