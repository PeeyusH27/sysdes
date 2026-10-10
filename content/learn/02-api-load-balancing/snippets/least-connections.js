// Send each request to the server with the fewest in-flight requests
export class LeastConnections {
  constructor(urls) { this.servers = urls.map(url => ({ url, active: 0, healthy: true })); }
  async handle(request, send) {
    const candidates = this.servers.filter(s => s.healthy);
    if (!candidates.length) throw new Error('no healthy servers');
    const s = candidates.reduce((a, b) => (b.active < a.active ? b : a));
    s.active++;
    try { return await send(s.url, request); }
    finally { s.active--; }
  }
}
