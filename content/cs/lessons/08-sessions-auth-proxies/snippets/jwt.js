import { createHmac, timingSafeEqual } from 'node:crypto';

// A JWT is three base64url parts: header.payload.signature. The payload is only SIGNED, not encrypted:
// anyone can read it, but nobody can change it without the secret.
const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString());
const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

export function issue(claims, secret, { ttlSeconds = 900, now = Date.now() } = {}) {
  const iat = Math.floor(now / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ ...claims, iat, exp: iat + ttlSeconds });
  return `${header}.${payload}.${sign(`${header}.${payload}`, secret)}`;
}

export function verify(token, secret, { now = Date.now() } = {}) {
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra !== undefined) throw new Error('malformed');
  if (decode(header).alg !== 'HS256') throw new Error('unexpected algorithm'); // never let the token choose its own check
  const expected = Buffer.from(sign(`${header}.${payload}`, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new Error('bad signature');
  const claims = decode(payload);
  if (claims.exp * 1000 <= now) throw new Error('expired');
  return claims;
}
