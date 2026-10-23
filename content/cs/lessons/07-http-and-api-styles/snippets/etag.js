import { createHash } from 'node:crypto';

// An ETag is a fingerprint of the response body. The browser sends it back in If-None-Match,
// and if nothing changed the server answers 304 with no body: the bytes are saved, not the round trip.
export const etagOf = (body) => `"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`;

export function respond(body, requestHeaders = {}) {
  const etag = etagOf(body);
  const headers = { etag, 'cache-control': 'max-age=60' }; // fresh for 60 s: no request at all
  if (requestHeaders['if-none-match'] === etag) return { status: 304, headers };
  return { status: 200, headers, body };
}
