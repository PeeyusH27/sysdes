// CORS is the SERVER telling the BROWSER which other sites' scripts may read its responses.
// A preflight is an OPTIONS request the browser sends first for anything beyond a plain GET/POST form.
export function cors(request, config) {
  const { method, origin, requestMethod, requestHeaders = [] } = request;
  const { allowed, methods = ['GET', 'POST'], headers = ['content-type'], credentials = false, maxAge = 600 } = config;
  const preflight = method === 'OPTIONS' && requestMethod !== undefined;

  if (!origin || !allowed.includes(origin)) return { status: preflight ? 403 : 200, headers: {} }; // no CORS headers: the browser hides the reply

  // The origin is echoed back, never '*', because credentials are not allowed with a wildcard.
  const base = { 'access-control-allow-origin': origin, vary: 'Origin' };
  if (credentials) base['access-control-allow-credentials'] = 'true';
  if (!preflight) return { status: 200, headers: base };

  const okMethod = methods.includes(requestMethod);
  const okHeaders = requestHeaders.every((h) => headers.includes(h.toLowerCase()));
  if (!okMethod || !okHeaders) return { status: 403, headers: {} };
  return { status: 204, headers: { ...base, 'access-control-allow-methods': methods.join(', '), 'access-control-allow-headers': headers.join(', '), 'access-control-max-age': String(maxAge) } };
}
