// @display-only: needs the undici package and your Node HTTP `server`
import { Agent, setGlobalDispatcher } from 'undici';

// Node's fetch (undici) already reuses connections; tune its pool for heavy service-to-service traffic
setGlobalDispatcher(new Agent({ connections: 128, keepAliveTimeout: 10_000, keepAliveMaxTimeout: 60_000 }));

// The server side, behind a load balancer: keep idle sockets open LONGER than the LB does (AWS ALB: 60 s).
// Otherwise Node closes a socket at the moment the LB reuses it, and the user gets a 502.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;       // keep this above keepAliveTimeout
