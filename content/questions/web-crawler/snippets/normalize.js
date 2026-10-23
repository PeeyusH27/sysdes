// Two spellings of one page must become one string, or the "seen" check lets the same page in twice.
// Rules: lower-case scheme and host, drop the fragment and the default port, resolve ../ segments,
// drop tracking parameters, sort the rest, and trim a trailing slash on non-root paths.
const TRACKING = /^(utm_|fbclid$|gclid$|ref$|sessionid$)/i;

export function normalize(raw, base) {
  let u;
  try {
    u = new URL(raw, base);
  } catch {
    return null;                                   // not a URL at all
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;   // mailto:, javascript:, tel:
  u.hash = '';
  // The URL class already lower-cases the host and drops :80 / :443 for the matching scheme.
  const kept = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k));
  kept.sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0));
  u.search = '';
  for (const [k, v] of kept) u.searchParams.append(k, v);
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
  return u.toString();
}

// The host is the unit of politeness: all URLs of one host share one queue and one delay.
export const hostOf = (url) => new URL(url).host;
