import { test, expect } from 'vitest';
import { makeResolver } from './dns-resolver.js';

const servers = (ttl) => ({
  root: (name) => (name.endsWith('.com') ? { refer: 'tld' } : { refer: 'nowhere' }),
  tld: (name) => (name.endsWith('example.com') ? { refer: 'auth' } : { refer: 'nowhere' }),
  auth: () => ({ ip: '93.184.216.34', ttl }),
});

test('a cold lookup walks root, TLD and authoritative server: 3 queries', () => {
  const resolve = makeResolver(servers(300));
  expect(resolve('www.example.com')).toEqual({ ip: '93.184.216.34', queries: 3 });
});

test('the second lookup is answered from the cache with no queries', () => {
  const resolve = makeResolver(servers(300));
  resolve('www.example.com');
  expect(resolve('www.example.com').queries).toBe(0);
});

test('after the TTL expires the resolver asks again, so a changed address is picked up', () => {
  let t = 0;
  const resolve = makeResolver(servers(300), () => t);
  resolve('www.example.com');
  t = 299_000;
  expect(resolve('www.example.com').queries).toBe(0); // still cached
  t = 301_000;
  expect(resolve('www.example.com').queries).toBe(3); // expired
});

test('a referral loop gives up instead of spinning forever', () => {
  const loop = { root: () => ({ refer: 'a' }), a: () => ({ refer: 'root' }) };
  expect(() => makeResolver(loop)('x.com')).toThrow('too many referrals');
});
