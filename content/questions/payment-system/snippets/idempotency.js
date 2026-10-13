import { createHash } from 'node:crypto';

// An in-memory idempotency store with the same rules as the idempotency_keys table:
//   new key                       → claim it ('started') and do the work
//   same key, same body, finished → replay the stored response (status code and body)
//   same key, same body, running  → 409 Conflict: try again shortly
//   same key, different body      → 422: a key belongs to exactly one request
// In Postgres the claim is INSERT … ON CONFLICT DO NOTHING on (scope, key), so two
// concurrent requests can't both win. Here one synchronous Map operation plays that role.

/** Hash of the request body with keys sorted, so { a, b } and { b, a } are the same request. */
export function requestHash(body) {
  const canonical = (v) =>
    Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;
  return createHash('sha256').update(JSON.stringify(canonical(body))).digest('hex');
}

export class IdempotencyStore {
  #rows = new Map();

  begin(scope, key, body) {
    const id = `${scope}:${key}`;
    const hash = requestHash(body);
    const row = this.#rows.get(id);
    if (!row) {
      this.#rows.set(id, { hash, status: 'started' });
      return { kind: 'new' };
    }
    if (row.hash !== hash) return { kind: 'mismatch', status: 422 };
    if (row.status === 'done') return { kind: 'replay', ...row.response };
    // A row stuck in 'started' after a crash is settled by the recovery job, which asks the PSP.
    return { kind: 'in_flight', status: 409 };
  }

  /** Store the final response. Declines are final responses too: a retry replays the decline. */
  finish(scope, key, response) {
    const row = this.#rows.get(`${scope}:${key}`);
    if (!row) throw new Error('finish() without begin()');
    row.status = 'done';
    row.response = structuredClone(response);
  }

  /** Release the key after a failure that happened before any side effect (e.g. validation), so a fixed retry can run. */
  abandon(scope, key) {
    const row = this.#rows.get(`${scope}:${key}`);
    if (row?.status === 'started') this.#rows.delete(`${scope}:${key}`);
  }
}
