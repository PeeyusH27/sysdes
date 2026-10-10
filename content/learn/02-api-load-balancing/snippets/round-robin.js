// Round robin that skips unhealthy servers (a health checker flips `up`)
export const servers = [{ url: 'a:3000', up: true }, { url: 'b:3000', up: true }, { url: 'c:3000', up: false }];
let i = 0;

export function pick() {
  for (let n = 0; n < servers.length; n++) {
    const s = servers[i++ % servers.length];
    if (s.up) return s.url;       // skip unhealthy nodes
  }
  throw new Error('no healthy servers');
}
// pick() × 4 → 'a:3000', 'b:3000', 'a:3000', 'b:3000' (c is down)
