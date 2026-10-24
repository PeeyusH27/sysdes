import type { DecisionSpec, FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const requestPath: FlowSpec = {
  id: "request-path",
  title: "Request path",
  description: "Requests enter through the API gateway, the load balancer spreads them over identical stateless instances, and every instance shares one database and session store.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1, sub: "browser / app" },
    { id: "gateway", label: "API gateway", kind: "gateway", col: 1, row: 1, sub: "auth, rate limits" },
    { id: "lb", label: "Load balancer", kind: "lb", col: 2, row: 1, sub: "L7, health checks" },
    { id: "a", label: "Service A", kind: "service", col: 3, row: 0 },
    { id: "b", label: "Service B", kind: "service", col: 3, row: 1 },
    { id: "c", label: "Service C", kind: "service", col: 3, row: 2 },
    { id: "sessions", label: "Redis sessions", kind: "cache", col: 4, row: 0, sub: "~1 ms", note: "Shared session store: any instance can read any user's session" },
    { id: "db", label: "Database", kind: "database", col: 4, row: 1 },
  ],
  edges: [
    { from: "client", to: "gateway" },
    { from: "gateway", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
    { from: "a", to: "db" },
    { from: "b", to: "db" },
    { from: "c", to: "db" },
    { from: "a", to: "sessions" },
    { from: "b", to: "sessions", label: "session" },
  ],
  scenarios: [
    {
      id: "happy",
      name: "Happy path",
      steps: [
        { edge: "client>gateway", caption: "Requests arrive at the API gateway, the single front door." },
        { edge: "gateway>lb", caption: "The gateway checks the token and rate limit, then hands each request to the load balancer." },
        {
          edge: "lb>a",
          caption: "The load balancer spreads requests over the healthy instances: one to A, the next to B, the next to C.",
          with: [{ edge: "lb>b", caption: "" }, { edge: "lb>c", caption: "" }],
        },
        {
          edge: "a>db",
          caption: "The instances are identical and stateless: each reads what it needs from the shared database.",
          with: [{ edge: "b>db", caption: "" }, { edge: "c>db", caption: "" }],
        },
        {
          edge: "lb>a",
          reverse: true,
          tone: "ok",
          caption: "Responses flow back. Need more capacity? Add another instance behind the load balancer.",
          with: [{ edge: "lb>b", reverse: true, tone: "ok", caption: "" }, { edge: "lb>c", reverse: true, tone: "ok", caption: "" }],
        },
        { edge: "client>gateway", reverse: true, tone: "ok", caption: "The client never knows which instance served it." },
      ],
    },
    {
      id: "failure",
      name: "Instance failure",
      steps: [
        { edge: "lb>c", tone: "error", caption: "Service C crashes. The load balancer's health check to /readyz times out: 1 failure.", mark: [{ node: "c", state: "busy" }] },
        { edge: "lb>c", tone: "error", caption: "The second check fails too. One failure could be a blip, so the LB waits for a threshold." },
        { edge: "lb>c", tone: "error", caption: "Third failure in a row: the LB marks C down and stops routing to it.", mark: [{ node: "c", state: "down" }] },
        {
          edge: "lb>a",
          caption: "New requests go only to A and B. Users see no errors, only a little more load on the survivors.",
          with: [{ edge: "lb>b", caption: "" }],
          mark: [{ node: "a", state: "busy" }, { node: "b", state: "busy" }],
        },
        { edge: "lb>c", tone: "ok", caption: "C restarts. After 2 successful checks in a row it's marked up and gets traffic again.", mark: [{ node: "c", state: "ok" }] },
        {
          edge: "lb>a",
          caption: "Load is spread across all three again.",
          with: [{ edge: "lb>b", caption: "" }, { edge: "lb>c", caption: "" }],
          mark: [{ node: "a", state: null }, { node: "b", state: null }, { node: "c", state: null }],
        },
      ],
    },
    {
      id: "sticky",
      name: "Sticky-session pitfall",
      steps: [
        { edge: "client>gateway", caption: "Alice logs in." },
        { edge: "gateway>lb", caption: "The login reaches the load balancer." },
        { edge: "lb>b", caption: "It lands on Service B, which keeps her session in its own memory. Redis isn't used.", mark: [{ node: "b", state: "ok" }] },
        { edge: "gateway>lb", caption: "A moment later, Alice opens her orders page." },
        { edge: "lb>a", tone: "miss", caption: "Round robin sends this request to Service A. A has never seen her session…", mark: [{ node: "a", state: "miss" }] },
        {
          edge: "client>gateway",
          reverse: true,
          tone: "error",
          caption: "…so A answers 401 and Alice is logged out. Sticky sessions only hide this: she is still logged out when B crashes or redeploys.",
        },
      ],
    },
    {
      id: "fix",
      name: "Fix: shared session store",
      steps: [
        { edge: "lb>b", caption: "Alice logs in and the request lands on Service B." },
        { edge: "b>sessions", caption: "B writes the session to Redis (SET session:abc … EX 1800) instead of keeping it in memory.", mark: [{ node: "sessions", state: "ok" }] },
        { edge: "lb>a", caption: "Her next request lands on Service A." },
        { edge: "a>sessions", caption: "A looks up session:abc in Redis: about 1 ms." },
        { edge: "a>sessions", reverse: true, tone: "ok", caption: "Found. A serves the request as Alice.", mark: [{ node: "a", state: "ok" }] },
        {
          edge: "client>gateway",
          reverse: true,
          tone: "ok",
          caption: "Alice stays logged in. Any instance can serve any user, so instances can be added, drained or killed freely.",
        },
      ],
    },
  ],
};

/* ---------- Stateless services: three places for a session ---------- */

export const stickyPin: FlowSpec = {
  id: "sticky-pin",
  title: "Sticky sessions pin a user to one instance",
  description: "A cookie pins Alice to Service B, which keeps her session in memory. It works until B restarts, crashes or is scaled in.",
  nodes: [
    { id: "client", label: "Alice", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1, sub: "cookie affinity" },
    { id: "a", label: "Service A", kind: "service", col: 2, row: 0 },
    { id: "b", label: "Service B", kind: "service", col: 2, row: 2, sub: "her session in RAM" },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b", label: "pinned" },
  ],
  scenarios: [
    {
      id: "pinned",
      name: "Pinned",
      steps: [
        { edge: "client>lb", caption: "Alice logs in. The balancer picks Service B and sets an affinity cookie." },
        { edge: "lb>b", caption: "B stores her session in its own memory.", mark: [{ node: "b", state: "ok" }] },
        { edge: "client>lb", caption: "Every later request carries the cookie…" },
        { edge: "lb>b", caption: "…so it lands on B again. Alice sees nothing wrong. Service A stays idle for her.", mark: [{ node: "a", state: null }] },
      ],
    },
    {
      id: "b-dies",
      name: "B restarts",
      steps: [
        { edge: "client>lb", caption: "A deploy restarts Service B. Its memory, and Alice's session, are gone.", mark: [{ node: "b", state: "down" }] },
        { edge: "lb>b", tone: "error", caption: "The cookie still points at B, but B is down, so the balancer must choose again." },
        { edge: "lb>a", tone: "miss", caption: "It sends Alice to A. A has never seen her session.", mark: [{ node: "a", state: "miss" }] },
        { edge: "client>lb", reverse: true, tone: "error", caption: "Alice is logged out and her cart is gone. Every deploy repeats this for every pinned user." },
      ],
    },
  ],
};

export const tokenAuth: SequenceSpec = {
  id: "token-auth",
  title: "A signed token needs no session lookup",
  description: "The server signs the user id and expiry into a token. Any instance can verify it with the shared key, so no instance stores anything.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "lb", label: "Load balancer", kind: "lb" },
    { id: "a", label: "Service A", kind: "service" },
    { id: "b", label: "Service B", kind: "service" },
  ],
  items: [
    {
      alt: [
        {
          when: "Normal use",
          items: [
            { from: "client", to: "lb", label: "POST /login", type: "call" },
            { from: "lb", to: "a", label: "login", type: "call" },
            { from: "a", to: "client", label: "200 + signed token (15 min)", type: "reply" },
            { note: "The token holds user id, expiry and a signature. Nothing is stored on A.", over: ["a"] },
            { from: "client", to: "lb", label: "GET /orders + token", type: "call" },
            { from: "lb", to: "b", label: "any instance", type: "call" },
            { note: "B checks the signature with the shared key. No lookup, no network hop.", over: ["b"] },
            { from: "b", to: "client", label: "200 orders", type: "reply" },
          ],
        },
        {
          when: "Revoking",
          items: [
            { from: "client", to: "lb", label: "POST /logout", type: "call" },
            { note: "A signed token stays valid until it expires, and no instance can take it back.", over: ["a", "b"] },
            { note: "Fixes: short lifetimes (15 min) plus a refresh token, or a small deny list in Redis.", over: ["lb"] },
          ],
        },
      ],
    },
  ],
};

/* ---------- L4 vs L7 ---------- */

export const l4Route: FlowSpec = {
  id: "l4-route",
  title: "An L4 balancer forwards connections",
  description: "An L4 balancer picks a server once per TCP connection and forwards packets without reading them. It is fast, but every request on one long-lived connection goes to the same server.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1, sub: "one HTTP/2 conn" },
    { id: "nlb", label: "L4 balancer", kind: "lb", col: 1, row: 1, sub: "IP + port only" },
    { id: "a", label: "Server A", kind: "service", col: 2, row: 0 },
    { id: "b", label: "Server B", kind: "service", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "nlb" },
    { from: "nlb", to: "a" },
    { from: "nlb", to: "b" },
  ],
  scenarios: [
    {
      id: "fast",
      name: "Fast forwarding",
      steps: [
        { edge: "client>nlb", caption: "A client opens a TCP connection. The L4 balancer sees only IP addresses and ports." },
        { edge: "nlb>a", caption: "It picks Server A and forwards the bytes untouched. TLS passes through; it never reads the request." },
        { edge: "nlb>a", reverse: true, tone: "ok", caption: "Very little work per packet, and it works for any protocol: HTTP, database, game traffic." },
      ],
    },
    {
      id: "pinned",
      name: "The long-connection trap",
      steps: [
        { edge: "client>nlb", caption: "A gRPC client opens one HTTP/2 connection and keeps it for hours." },
        { edge: "nlb>a", caption: "The balancer chose A for that connection, once.", mark: [{ node: "a", state: "ok" }] },
        { edge: "client>nlb", caption: "The client sends 1,000 requests a second, all on that same connection.", with: [{ edge: "client>nlb", caption: "" }, { edge: "client>nlb", caption: "" }] },
        { edge: "nlb>a", tone: "error", caption: "All 1,000 go to A. B sits idle. An L4 balancer cannot spread requests it cannot see.", mark: [{ node: "a", state: "busy" }, { node: "b", state: null }] },
      ],
    },
  ],
};

export const l7Route: FlowSpec = {
  id: "l7-route",
  title: "An L7 balancer routes by request",
  description: "An L7 balancer terminates TLS, reads the URL and headers, and routes each request on its own. That unlocks path routing, retries and canary releases.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "alb", label: "L7 balancer", kind: "lb", col: 1, row: 1, sub: "reads URL, headers" },
    { id: "orders", label: "Orders v1", kind: "service", col: 2, row: 0 },
    { id: "web", label: "Web app", kind: "storage", col: 2, row: 1, sub: "static files" },
    { id: "orders2", label: "Orders v2", kind: "service", col: 2, row: 2, sub: "canary" },
  ],
  edges: [
    { from: "client", to: "alb" },
    { from: "alb", to: "orders", label: "/orders" },
    { from: "alb", to: "web", label: "/static" },
    { from: "alb", to: "orders2", label: "5%" },
  ],
  scenarios: [
    {
      id: "paths",
      name: "Path routing",
      steps: [
        { edge: "client>alb", caption: "The balancer ends TLS and reads the request line: GET /orders/123." },
        { edge: "alb>orders", caption: "The path starts with /orders, so it goes to the orders service." },
        { edge: "client>alb", caption: "Next request: GET /static/app.js." },
        { edge: "alb>web", caption: "Different path, different target. One public hostname fronts many services." },
      ],
    },
    {
      id: "canary",
      name: "Canary release",
      steps: [
        { edge: "client>alb", caption: "You deploy Orders v2 next to v1 and tell the balancer to send it 5% of traffic." },
        { edge: "alb>orders", caption: "Out of every 100 requests, 95 still go to v1.", mark: [{ node: "orders", state: "ok" }] },
        { edge: "alb>orders2", caption: "5 go to v2. Watch its error rate and p99 for ten minutes.", mark: [{ node: "orders2", state: "busy" }] },
        { edge: "alb>orders2", reverse: true, tone: "ok", caption: "Healthy: raise it to 25%, then 100%. Unhealthy: set it back to 0 in seconds.", mark: [{ node: "orders2", state: "ok" }] },
      ],
    },
  ],
};

export const bothLayers: FlowSpec = {
  id: "both-layers",
  title: "L4 in front of L7",
  description: "A cheap L4 balancer spreads connections over a fleet of L7 proxies, and each proxy routes requests to services. Add proxies without clients noticing.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "nlb", label: "L4 balancer", kind: "lb", col: 1, row: 1, sub: "one stable IP" },
    { id: "p1", label: "Proxy 1 (L7)", kind: "gateway", col: 2, row: 0 },
    { id: "p2", label: "Proxy 2 (L7)", kind: "gateway", col: 2, row: 2 },
    { id: "svc", label: "Services", kind: "service", col: 3, row: 1 },
  ],
  edges: [
    { from: "client", to: "nlb" },
    { from: "nlb", to: "p1" },
    { from: "nlb", to: "p2" },
    { from: "p1", to: "svc" },
    { from: "p2", to: "svc" },
  ],
  scenarios: [
    {
      id: "tiers",
      name: "Two tiers",
      steps: [
        { edge: "client>nlb", caption: "Clients know one address. The L4 balancer is cheap, so one pair handles huge connection counts." },
        { edge: "nlb>p1", caption: "It spreads connections over the L7 proxies.", with: [{ edge: "nlb>p2", caption: "" }] },
        { edge: "p1>svc", caption: "Each proxy reads requests and routes them to the right service, with retries.", with: [{ edge: "p2>svc", caption: "" }] },
      ],
    },
    {
      id: "proxy-down",
      name: "A proxy dies",
      steps: [
        { edge: "nlb>p1", tone: "error", caption: "Proxy 1 stops answering TCP health checks.", mark: [{ node: "p1", state: "down" }] },
        { edge: "nlb>p2", caption: "The L4 balancer sends new connections only to Proxy 2. Add a third proxy and nothing changes for clients.", mark: [{ node: "p2", state: "busy" }] },
      ],
    },
  ],
};

/* ---------- Balancing algorithms ---------- */

export const rrSlow: FlowSpec = {
  id: "rr-slow",
  title: "Round robin keeps feeding a slow server",
  description: "Round robin hands out requests in turn and never looks at load, so a slow server keeps receiving a third of the traffic.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Round robin", kind: "lb", col: 1, row: 1, sub: "A, B, C, A, B, C" },
    { id: "a", label: "Server A", kind: "service", col: 2, row: 0, sub: "20 ms" },
    { id: "b", label: "Server B", kind: "service", col: 2, row: 1, sub: "20 ms" },
    { id: "c", label: "Server C", kind: "service", col: 2, row: 2, sub: "20 ms" },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
  ],
  scenarios: [
    {
      id: "even",
      name: "Equal servers",
      steps: [
        { edge: "client>lb", caption: "Three equal servers, every call about 20 ms." },
        { edge: "lb>a", caption: "Request 1 goes to A, request 2 to B, request 3 to C…", with: [{ edge: "lb>b", caption: "" }, { edge: "lb>c", caption: "" }] },
        { edge: "lb>a", caption: "…then request 4 goes back to A. Each server gets exactly one third. Nothing is simpler." },
      ],
    },
    {
      id: "slow",
      name: "C turns slow",
      steps: [
        { edge: "client>lb", caption: "Server C starts a garbage-collection storm: its calls now take 2 seconds.", mark: [{ node: "c", state: "busy" }] },
        { edge: "lb>c", caption: "Round robin does not know. C still gets every third request.", with: [{ edge: "lb>a", caption: "" }, { edge: "lb>b", caption: "" }] },
        { edge: "lb>c", tone: "error", caption: "A and B finish in 20 ms and take more. C's queue only grows, so a third of users wait seconds.", mark: [{ node: "c", state: "down" }] },
      ],
    },
  ],
};

export const leastConn: FlowSpec = {
  id: "least-conn",
  title: "Least connections follows the open count",
  description: "Least connections sends each request to the server with the fewest requests in flight. A server that holds requests longer simply gets fewer.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Least conns", kind: "lb", col: 1, row: 1, sub: "tracks open count" },
    { id: "a", label: "Server A", kind: "service", col: 2, row: 0, sub: "2 open" },
    { id: "b", label: "Server B", kind: "service", col: 2, row: 1, sub: "3 open" },
    { id: "c", label: "Server C", kind: "service", col: 2, row: 2, sub: "12 open" },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
  ],
  scenarios: [
    {
      id: "slow",
      name: "A slow server",
      steps: [
        { edge: "client>lb", caption: "C is slow, so its requests stay open: 12 in flight against 2 and 3.", mark: [{ node: "c", state: "busy" }] },
        { edge: "lb>a", caption: "The balancer compares the counts and picks A, the least loaded." },
        { edge: "lb>b", caption: "Next, A has 3 open and B has 3: ties break to either. C is skipped while its count is high." },
        { edge: "lb>a", caption: "C drains at its own pace and receives work again when its count falls. The slow server protects itself.", mark: [{ node: "c", state: null }] },
      ],
    },
    {
      id: "mixed",
      name: "Mixed request costs",
      steps: [
        { edge: "client>lb", caption: "A 5-second CSV export lands on A beside 5 ms lookups." },
        { edge: "lb>a", caption: "A now holds 1 open request that will last. Round robin would still hand it a full share.", mark: [{ node: "a", state: "busy" }] },
        { edge: "lb>b", caption: "Lookups finish in 5 ms and free their count, so B and C absorb the stream.", with: [{ edge: "lb>c", caption: "" }] },
      ],
    },
  ],
};

export const p2cFlow: FlowSpec = {
  id: "p2c-flow",
  title: "Power of two choices",
  description: "Pick two servers at random and send the request to the less loaded one. It balances almost like least connections, without scanning the whole fleet or sharing state.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "P2C balancer", kind: "lb", col: 1, row: 1, sub: "samples two" },
    { id: "a", label: "Server A", kind: "service", col: 2, row: 0, sub: "7 open" },
    { id: "b", label: "Server B", kind: "service", col: 2, row: 1, sub: "4 open" },
    { id: "c", label: "Server C", kind: "service", col: 2, row: 2, sub: "9 open" },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
  ],
  scenarios: [
    {
      id: "two",
      name: "Two random picks",
      steps: [
        { edge: "client>lb", caption: "A request arrives. The balancer does not look at the whole fleet." },
        { edge: "lb>b", caption: "It samples two servers at random: B (4 open) and C (9 open).", with: [{ edge: "lb>c", caption: "" }] },
        { edge: "lb>b", tone: "ok", caption: "B has fewer open requests, so B wins. The sample never included A (7 open), and that is fine.", mark: [{ node: "b", state: "ok" }] },
      ],
    },
    {
      id: "why",
      name: "Why it works",
      steps: [
        { edge: "client>lb", caption: "Pure random assignment leaves some servers far busier than average." },
        { edge: "lb>a", caption: "Choosing the better of just two random servers removes most of that gap: the busiest server ends up exponentially closer to the average.", with: [{ edge: "lb>b", caption: "" }] },
        { edge: "lb>c", caption: "Cost: two lookups, no shared counter. That is why large proxy fleets use it." },
      ],
    },
  ],
};

export const hashRoute: FlowSpec = {
  id: "hash-route",
  title: "Hashing sends a key to the same server",
  description: "The balancer hashes a key (user id or IP) to pick a server, so the same key always lands on the same server and its warm cache.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Hash balancer", kind: "lb", col: 1, row: 1, sub: "hash(user id)" },
    { id: "a", label: "Cache node A", kind: "cache", col: 2, row: 0 },
    { id: "b", label: "Cache node B", kind: "cache", col: 2, row: 1 },
    { id: "c", label: "Cache node C", kind: "cache", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
  ],
  scenarios: [
    {
      id: "affinity",
      name: "Same key, same node",
      steps: [
        { edge: "client>lb", caption: "User 42 sends a request." },
        { edge: "lb>b", caption: "hash(42) points at B. B loads user 42's data and keeps it warm.", mark: [{ node: "b", state: "ok" }] },
        { edge: "lb>b", caption: "Every later request for user 42 goes to B and hits that warm cache." },
      ],
    },
    {
      id: "remap",
      name: "A node leaves",
      steps: [
        { edge: "lb>c", tone: "error", caption: "Node C is removed. With plain hash mod N, going from 4 nodes to 3 moves 75% of all keys.", mark: [{ node: "c", state: "down" }] },
        { edge: "lb>a", caption: "Those keys are suddenly cache misses everywhere, and the database takes the hit.", mark: [{ node: "a", state: "miss" }, { node: "b", state: "miss" }] },
        { edge: "lb>b", tone: "ok", caption: "Consistent hashing gives the removed node's keys to its neighbours. Only that node's share, 25% of 4, moves.", mark: [{ node: "a", state: null }, { node: "b", state: "ok" }] },
      ],
    },
  ],
};

export const pickAlgo: DecisionSpec = {
  id: "pick-algo",
  title: "Which balancing algorithm?",
  start: "same",
  nodes: {
    same: { q: "Same-size servers, similar requests?", yes: "keys", no: "sizes" },
    keys: { q: "Must a key stick to one server?", yes: "hash", no: "rr" },
    sizes: { q: "Only the server sizes differ?", yes: "wrr", no: "many" },
    many: { q: "Many balancers share one fleet?", yes: "p2c", no: "least" },
    rr: { result: "Round robin", why: "The default for a uniform stateless service. Start here, and move only when you can name the problem." },
    hash: { result: "Consistent hash", why: "Per-key affinity for caches and shards. Watch for a hot key overloading one server." },
    wrr: { result: "Weighted round robin", why: "Give a 16-core machine five times the share of a 4-core one, smoothly spread." },
    p2c: { result: "Power of two choices", why: "Near-least-connections balance with no shared counter. Good across a proxy fleet." },
    least: { result: "Least connections", why: "Adapts to slow servers and mixed request costs. Needs an accurate open count." },
  },
};

/* ---------- Health checks ---------- */

export const healthSeq: SequenceSpec = {
  id: "health-seq",
  title: "Active health checks",
  description: "The balancer probes /readyz every few seconds. Three failures in a row mark the instance down; two successes mark it up again.",
  actors: [
    { id: "lb", label: "Load balancer", kind: "lb" },
    { id: "inst", label: "Instance C", kind: "service" },
  ],
  items: [
    {
      alt: [
        {
          when: "Healthy",
          items: [
            { from: "lb", to: "inst", label: "GET /readyz (every 5 s)", type: "call" },
            { from: "inst", to: "lb", label: "200 OK", type: "reply" },
            { note: "Stays in rotation. A single timeout would not change anything.", over: ["lb", "inst"] },
          ],
        },
        {
          when: "Going down",
          items: [
            { from: "lb", to: "inst", label: "GET /readyz", type: "call" },
            { note: "Timeout. Failure 1 of 3: could be a blip.", over: ["inst"] },
            { from: "lb", to: "inst", label: "GET /readyz (+5 s)", type: "call" },
            { note: "Failure 2 of 3.", over: ["inst"] },
            { from: "lb", to: "inst", label: "GET /readyz (+10 s)", type: "call" },
            { note: "Failure 3: marked down after about 15 s. No new requests go to C.", over: ["lb"] },
          ],
        },
        {
          when: "Coming back",
          items: [
            { from: "lb", to: "inst", label: "GET /readyz", type: "call" },
            { from: "inst", to: "lb", label: "200 OK (1 of 2)", type: "reply" },
            { from: "lb", to: "inst", label: "GET /readyz", type: "call" },
            { from: "inst", to: "lb", label: "200 OK (2 of 2)", type: "reply" },
            { note: "Two good checks in a row: back in rotation, so a flapping instance cannot yo-yo.", over: ["lb"] },
          ],
        },
      ],
    },
  ],
};

export const passiveEject: FlowSpec = {
  id: "passive-eject",
  title: "Passive health checks watch real traffic",
  description: "The balancer counts failures on real requests and ejects an instance that keeps returning errors, often faster than a scheduled probe notices.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1, sub: "counts 5xx" },
    { id: "a", label: "Server A", kind: "service", col: 2, row: 0 },
    { id: "b", label: "Server B", kind: "service", col: 2, row: 1 },
    { id: "c", label: "Server C", kind: "service", col: 2, row: 2, sub: "answers 503" },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
  ],
  scenarios: [
    {
      id: "eject",
      name: "Eject on errors",
      steps: [
        { edge: "lb>c", tone: "error", caption: "C passes its /readyz probe but real requests return 503, for example a broken downstream connection.", mark: [{ node: "c", state: "busy" }] },
        { edge: "lb>c", tone: "error", caption: "Five 503s in a row. The balancer does not wait for the next probe." },
        { edge: "lb>c", tone: "error", caption: "C is ejected for 30 seconds.", mark: [{ node: "c", state: "down" }] },
        { edge: "lb>a", caption: "Traffic flows to A and B meanwhile, and the proxy retries the failed idempotent requests there.", with: [{ edge: "lb>b", caption: "" }] },
        { edge: "lb>c", tone: "ok", caption: "After 30 seconds C gets a trial request. If it succeeds, C returns to the pool.", mark: [{ node: "c", state: "ok" }] },
      ],
    },
  ],
};

export const readinessTrap: FlowSpec = {
  id: "readiness-trap",
  title: "Readiness must not depend on optional services",
  description: "If /readyz fails whenever the optional recommendations service is down, every instance fails at once and the balancer has nowhere to send traffic.",
  nodes: [
    { id: "lb", label: "Load balancer", kind: "lb", col: 0, row: 1 },
    { id: "a", label: "Instance A", kind: "service", col: 1, row: 0 },
    { id: "b", label: "Instance B", kind: "service", col: 1, row: 1 },
    { id: "c", label: "Instance C", kind: "service", col: 1, row: 2 },
    { id: "recs", label: "Recommender", kind: "external", col: 2, row: 1, sub: "optional" },
  ],
  edges: [
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
    { from: "a", to: "recs" },
    { from: "b", to: "recs" },
    { from: "c", to: "recs" },
  ],
  scenarios: [
    {
      id: "wrong",
      name: "Wrong: depend on it",
      steps: [
        { edge: "b>recs", tone: "error", caption: "Recommendations goes down. It only powers a carousel on the product page.", with: [{ edge: "a>recs", tone: "error", caption: "" }, { edge: "c>recs", tone: "error", caption: "" }], mark: [{ node: "recs", state: "down" }] },
        { edge: "lb>b", tone: "error", caption: "Each instance's /readyz calls recommendations, so all three answer 503.", with: [{ edge: "lb>a", tone: "error", caption: "" }, { edge: "lb>c", tone: "error", caption: "" }], mark: [{ node: "a", state: "down" }, { node: "b", state: "down" }, { node: "c", state: "down" }] },
        { edge: "lb>a", tone: "error", caption: "The balancer marks every instance down. The whole site returns 503 because of a carousel." },
      ],
    },
    {
      id: "right",
      name: "Right: degrade",
      steps: [
        { edge: "b>recs", tone: "error", caption: "Same outage. Now /readyz checks only what the instance cannot work without: its own database.", with: [{ edge: "a>recs", tone: "error", caption: "" }, { edge: "c>recs", tone: "error", caption: "" }], mark: [{ node: "recs", state: "down" }] },
        { edge: "lb>b", tone: "ok", caption: "All three stay ready and keep taking traffic.", with: [{ edge: "lb>a", tone: "ok", caption: "" }, { edge: "lb>c", tone: "ok", caption: "" }], mark: [{ node: "a", state: "ok" }, { node: "b", state: "ok" }, { node: "c", state: "ok" }] },
        { edge: "b>recs", caption: "The page omits the carousel, behind a short timeout and a circuit breaker. Users lose a feature, not the site." },
      ],
    },
  ],
};

export const drainSeq: SequenceSpec = {
  id: "drain-seq",
  title: "Connection draining during a deploy",
  description: "On SIGTERM the instance stops being ready, the balancer stops sending new requests, and in-flight requests finish before the process exits.",
  actors: [
    { id: "orch", label: "Deployer", kind: "worker" },
    { id: "inst", label: "Instance", kind: "service" },
    { id: "lb", label: "Load balancer", kind: "lb" },
    { id: "client", label: "Client", kind: "client" },
  ],
  items: [
    { from: "client", to: "inst", label: "slow request in flight", type: "call" },
    { from: "orch", to: "inst", label: "SIGTERM", type: "async" },
    { note: "The instance sets shuttingDown, so /readyz now answers 503.", over: ["inst"] },
    { from: "lb", to: "inst", label: "GET /readyz", type: "call" },
    { from: "inst", to: "lb", label: "503", type: "reply" },
    { note: "No new requests are routed here. Requests already running are left alone.", over: ["lb"] },
    { from: "inst", to: "client", label: "200 (finished normally)", type: "reply" },
    { note: "In-flight count reaches 0, or a grace period ends (30 s is common): exit.", over: ["inst"] },
  ],
};

/* ---------- What goes wrong ---------- */

export const spiral: FlowSpec = {
  id: "slow-spiral",
  title: "The slow-server spiral",
  description: "One slow server causes timeouts, the timeouts cause retries, and the retries make every server slower. A small fault becomes a fleet-wide outage.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1, sub: "timeout 1 s" },
    { id: "lb", label: "Round robin", kind: "lb", col: 1, row: 1 },
    { id: "a", label: "Server A", kind: "service", col: 2, row: 0 },
    { id: "b", label: "Server B", kind: "service", col: 2, row: 1 },
    { id: "c", label: "Server C", kind: "service", col: 2, row: 2, sub: "slow" },
  ],
  edges: [
    { from: "client", to: "lb", label: "retry" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
  ],
  scenarios: [
    {
      id: "spiral",
      name: "The spiral",
      steps: [
        { edge: "lb>c", tone: "error", caption: "13:00, a sale starts at 900 requests a second. C's database pool is exhausted: its calls go from 20 ms to 2 s.", mark: [{ node: "c", state: "busy" }] },
        { edge: "lb>c", tone: "error", caption: "C still gets 300 requests a second. At 2 s each, about 600 are in flight on C against about 6 normally.", mark: [{ node: "c", state: "down" }] },
        { edge: "client>lb", tone: "error", caption: "Clients time out at 1 s and retry, so each failed call adds a new one. Load climbs well past 900." },
        { edge: "lb>a", tone: "error", caption: "The retries land on A and B too, now running hotter than they can sustain.", with: [{ edge: "lb>b", tone: "error", caption: "" }], mark: [{ node: "a", state: "busy" }, { node: "b", state: "busy" }] },
      ],
    },
    {
      id: "fix",
      name: "The fix",
      steps: [
        { edge: "lb>c", tone: "error", caption: "Same fault on C. This time the balancer uses least connections or P2C, with outlier ejection.", mark: [{ node: "c", state: "busy" }] },
        { edge: "lb>c", caption: "C's open count climbs, so it receives far fewer new requests. After a run of timeouts it is ejected.", mark: [{ node: "c", state: "down" }] },
        { edge: "lb>a", tone: "ok", caption: "A and B carry 450 requests a second each, within their capacity. Retries are capped by a budget.", with: [{ edge: "lb>b", tone: "ok", caption: "" }], mark: [{ node: "a", state: "ok" }, { node: "b", state: "ok" }] },
      ],
    },
  ],
};

export const herd: FlowSpec = {
  id: "new-instance-herd",
  title: "A new instance gets flooded",
  description: "Least connections sees a fresh instance with zero open requests and sends it everything, before its caches, connection pools and JIT are warm.",
  nodes: [
    { id: "lb", label: "Least conns", kind: "lb", col: 0, row: 1 },
    { id: "a", label: "Instance A", kind: "service", col: 1, row: 0, sub: "warm" },
    { id: "b", label: "Instance B", kind: "service", col: 1, row: 1, sub: "warm" },
    { id: "new", label: "New instance", kind: "service", col: 1, row: 2, sub: "cold, 0 open" },
  ],
  edges: [
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "new" },
  ],
  scenarios: [
    {
      id: "flood",
      name: "Flooded",
      steps: [
        { edge: "lb>new", caption: "The autoscaler adds a third instance during a spike. It reports ready and has 0 open requests.", mark: [{ node: "new", state: "ok" }] },
        { edge: "lb>new", caption: "Least connections picks the lowest count, so nearly every new request goes to it.", with: [{ edge: "lb>new", caption: "" }, { edge: "lb>new", caption: "" }] },
        { edge: "lb>new", tone: "error", caption: "Cold caches and empty connection pools make it slow. Its count rises, requests time out, and it falls over.", mark: [{ node: "new", state: "down" }] },
      ],
    },
    {
      id: "slow-start",
      name: "Slow start",
      steps: [
        { edge: "lb>new", caption: "With slow start the balancer gives the new instance a small weight first, for example 10%.", mark: [{ node: "new", state: "ok" }] },
        { edge: "lb>new", caption: "Over 30 to 60 seconds the weight ramps to 100% while its caches and pools fill." },
        { edge: "lb>a", tone: "ok", caption: "A and B keep serving most traffic during the ramp. The new instance joins smoothly.", with: [{ edge: "lb>b", tone: "ok", caption: "" }] },
      ],
    },
  ],
};

export const lbPair: FlowSpec = {
  id: "lb-pair",
  title: "The balancer is a single point of failure",
  description: "One balancer is one more thing that can fail. Run two or more, with traffic steered away from a dead one.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "dns", label: "DNS", kind: "dns", col: 1, row: 1, sub: "TTL 60 s" },
    { id: "lb1", label: "Balancer 1", kind: "lb", col: 2, row: 0 },
    { id: "lb2", label: "Balancer 2", kind: "lb", col: 2, row: 2 },
    { id: "app", label: "Instances", kind: "service", col: 3, row: 1 },
  ],
  edges: [
    { from: "client", to: "dns" },
    { from: "dns", to: "lb1" },
    { from: "dns", to: "lb2" },
    { from: "lb1", to: "app" },
    { from: "lb2", to: "app" },
  ],
  scenarios: [
    {
      id: "two",
      name: "Two balancers",
      steps: [
        { edge: "client>dns", caption: "DNS returns the addresses of both balancers, so clients spread across them." },
        { edge: "dns>lb1", caption: "Each balancer carries half the traffic.", with: [{ edge: "dns>lb2", caption: "" }] },
        { edge: "lb1>app", caption: "Both forward to the same instances.", with: [{ edge: "lb2>app", caption: "" }] },
      ],
    },
    {
      id: "one-dies",
      name: "One dies",
      steps: [
        { edge: "dns>lb1", tone: "error", caption: "Balancer 1 dies.", mark: [{ node: "lb1", state: "down" }] },
        { edge: "client>dns", tone: "miss", caption: "Clients that cached its address keep trying it until the 60 s TTL runs out. Fast clients fall back to the other address.", mark: [{ node: "dns", state: "miss" }] },
        { edge: "dns>lb2", tone: "ok", caption: "Health-checked DNS stops returning the dead address, and Balancer 2 takes all traffic. Cloud balancers (ALB, NLB) already do this across zones; you build it yourself on bare metal, often with a floating IP.", mark: [{ node: "lb2", state: "busy" }, { node: "dns", state: null }] },
      ],
    },
  ],
};

/* ---------- REST ---------- */

export const statusTree: DecisionSpec = {
  id: "status-tree",
  title: "Which status code?",
  start: "ok",
  nodes: {
    ok: { q: "Did the request succeed?", yes: "created", no: "limited" },
    created: { q: "Did it create a resource?", yes: "r201", no: "async" },
    async: { q: "Is the work still running?", yes: "r202", no: "body" },
    body: { q: "Is there a body to return?", yes: "r200", no: "r204" },
    limited: { q: "Too many requests from this caller?", yes: "r429", no: "authn" },
    authn: { q: "Caller unknown (no or expired token)?", yes: "r401", no: "authz" },
    authz: { q: "Known caller, but not allowed?", yes: "r403", no: "exists" },
    exists: { q: "Does the resource exist?", yes: "shape", no: "r404" },
    shape: { q: "Malformed (bad JSON, missing field)?", yes: "r400", no: "clash" },
    clash: { q: "Clashes with current state?", yes: "r409", no: "rules" },
    rules: { q: "Well-formed but breaks a rule?", yes: "r422", no: "server" },
    server: { q: "Overloaded or shedding load?", yes: "r503", no: "r500" },
    r200: { result: "200 OK", why: "Success with a body: reads, and updates that return the resource." },
    r201: { result: "201 Created", why: "Return the new resource and a Location header." },
    r202: { result: "202 Accepted", why: "Queued, not done. Return a job id or a status URL to poll." },
    r204: { result: "204 No Content", why: "Success with nothing to return: DELETE, or a PUT with no body." },
    r400: { result: "400 Bad Request", why: "The client sent something unparseable. Retrying the same bytes will not help." },
    r401: { result: "401 Unauthorized", why: "Not authenticated. The fix is to log in or refresh the token." },
    r403: { result: "403 Forbidden", why: "Authenticated but not permitted: Alice asking for Bob's orders." },
    r404: { result: "404 Not Found", why: "No such resource, or you hide that it exists from callers who may not see it." },
    r409: { result: "409 Conflict", why: "Clashes with current state: duplicate, version mismatch, or an idempotency key still in progress." },
    r422: { result: "422 Unprocessable Content", why: "Well-formed but breaks a rule: an end date before the start date." },
    r429: { result: "429 Too Many Requests", why: "Rate limited. Always add a Retry-After header." },
    r500: { result: "500 Internal Server Error", why: "A bug or unexpected failure. Never blame the client with it." },
    r503: { result: "503 Service Unavailable", why: "Overloaded or not ready. Add Retry-After so clients back off." },
  },
};

export const asyncJob: SequenceSpec = {
  id: "async-job",
  title: "A long job returns 202 and a status URL",
  description: "A report that takes a minute should not hold a connection open. Accept it, hand back a status URL, and let the client poll.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "api", label: "API", kind: "service" },
    { id: "queue", label: "Queue", kind: "queue" },
    { id: "worker", label: "Worker", kind: "worker" },
  ],
  items: [
    { from: "client", to: "api", label: "POST /exports", type: "call" },
    { from: "api", to: "queue", label: "enqueue job 77", type: "async" },
    { from: "api", to: "client", label: "202 + Location: /exports/77", type: "reply" },
    { from: "queue", to: "worker", label: "job 77", type: "async" },
    {
      alt: [
        {
          when: "Still running",
          items: [
            { from: "client", to: "api", label: "GET /exports/77", type: "call" },
            { from: "api", to: "client", label: "200 status: running (Retry-After: 5)", type: "reply" },
          ],
        },
        {
          when: "Done",
          items: [
            { from: "worker", to: "api", label: "result stored", type: "async" },
            { from: "client", to: "api", label: "GET /exports/77", type: "call" },
            { from: "api", to: "client", label: "200 status: done + download URL", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ---------- Pagination and retries ---------- */

export const offsetScan: FlowSpec = {
  id: "offset-scan",
  title: "Offset pagination reads and discards rows",
  description: "OFFSET makes the database walk past every skipped row, so deep pages cost more, and new rows shift the pages under the reader.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "api", label: "API", kind: "service", col: 1, row: 1, sub: "?page=N&limit=20" },
    { id: "db", label: "Posts table", kind: "database", col: 2, row: 1, sub: "1M+ rows" },
  ],
  edges: [
    { from: "client", to: "api" },
    { from: "api", to: "db", label: "OFFSET" },
  ],
  scenarios: [
    {
      id: "deep",
      name: "Page 50,000",
      steps: [
        { edge: "client>api", caption: "GET /posts?page=50000&limit=20." },
        { edge: "api>db", caption: "LIMIT 20 OFFSET 999980. The database cannot jump: it reads 999,980 rows and throws them away." },
        { edge: "api>db", reverse: true, tone: "miss", caption: "It returns 20 rows after reading about a million. Page 1 read 20. Every deeper page costs more.", mark: [{ node: "db", state: "busy" }] },
      ],
    },
    {
      id: "shift",
      name: "A new post arrives",
      steps: [
        { edge: "client>api", caption: "Alice reads page 1: posts 1 to 20, newest first." },
        { edge: "api>db", caption: "Three seconds later, 3 new posts are published. Everything shifts down by 3.", mark: [{ node: "db", state: "ok" }] },
        { edge: "client>api", caption: "She asks for page 2: OFFSET 20." },
        { edge: "api>db", reverse: true, tone: "miss", caption: "Page 2 now begins with the 3 posts she already saw. With deletes, the opposite happens and posts are skipped.", mark: [{ node: "db", state: "miss" }] },
      ],
    },
  ],
};

export const cursorSeek: FlowSpec = {
  id: "cursor-seek",
  title: "Cursor pagination seeks into the index",
  description: "A cursor remembers the last item seen. The next page starts right after it, using the index, so every page costs the same and nothing shifts.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "api", label: "API", kind: "service", col: 1, row: 1, sub: "?cursor=abc" },
    { id: "db", label: "Posts table", kind: "database", col: 2, row: 1, sub: "index on id" },
  ],
  edges: [
    { from: "client", to: "api" },
    { from: "api", to: "db", label: "seek" },
  ],
  scenarios: [
    {
      id: "next",
      name: "Next page",
      steps: [
        { edge: "client>api", caption: "The client sends the cursor from the last response. It encodes the last id seen, say 9123." },
        { edge: "api>db", caption: "WHERE id < 9123 ORDER BY id DESC LIMIT 21. The index jumps straight to 9123: no rows are skipped." },
        { edge: "api>db", reverse: true, tone: "ok", caption: "21 rows come back. The 21st only proves a next page exists, and the 20th becomes the new cursor.", mark: [{ node: "db", state: "ok" }] },
      ],
    },
    {
      id: "stable",
      name: "A new post arrives",
      steps: [
        { edge: "client>api", caption: "Alice holds the cursor for the last post she saw. Three new posts arrive at the top." },
        { edge: "api>db", caption: "Her next page asks for ids below her cursor. The new posts have higher ids, so they cannot interfere." },
        { edge: "api>db", reverse: true, tone: "ok", caption: "No duplicates and no gaps. She finds the new posts by pulling to refresh from the top." },
      ],
    },
  ],
};

export const idemSeq: SequenceSpec = {
  id: "idem-seq",
  title: "Idempotency keys make a retry safe",
  description: "The client sends one UUID per intended action. The server claims it, performs the work once and replays the stored response for repeats.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "api", label: "API", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "pay", label: "Payments DB", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "First try",
          items: [
            { from: "client", to: "api", label: "POST /payments + Idempotency-Key k1", type: "call" },
            { from: "api", to: "redis", label: "SET idem:k1 pending NX", type: "call" },
            { from: "redis", to: "api", label: "OK, claimed", type: "reply" },
            { from: "api", to: "pay", label: "charge 49.00", type: "call" },
            { from: "api", to: "redis", label: "store 201 + body", type: "call" },
            { from: "api", to: "client", label: "201 Created", type: "reply" },
          ],
        },
        {
          when: "Retry after a timeout",
          items: [
            { note: "The first charge succeeded, but the response was lost on the way back.", over: ["client", "api"] },
            { from: "client", to: "api", label: "POST /payments + same key k1", type: "call" },
            { from: "api", to: "redis", label: "SET idem:k1 pending NX", type: "call" },
            { from: "redis", to: "api", label: "exists: state done", type: "reply" },
            { from: "api", to: "client", label: "201 Created (replayed)", type: "reply" },
            { note: "The payments database was never touched. No double charge.", over: ["pay"] },
          ],
        },
        {
          when: "Retry mid-flight",
          items: [
            { from: "client", to: "api", label: "POST /payments + same key k1", type: "call" },
            { from: "api", to: "redis", label: "SET idem:k1 pending NX", type: "call" },
            { from: "redis", to: "api", label: "exists: state pending", type: "reply" },
            { from: "api", to: "client", label: "409 Conflict: in progress", type: "reply" },
            { note: "The first request is still running. The client waits and retries later.", over: ["client"] },
          ],
        },
      ],
    },
  ],
};

/* ---------- API styles ---------- */

export const restScreen: FlowSpec = {
  id: "rest-screen",
  title: "REST: one resource per request",
  description: "REST maps cleanly onto HTTP and caches by URL. The cost shows when one screen needs several resources: each is its own round trip.",
  nodes: [
    { id: "app", label: "Mobile app", kind: "client", col: 0, row: 1, sub: "80 ms round trip" },
    { id: "api", label: "REST API", kind: "service", col: 1, row: 1 },
    { id: "db", label: "Database", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "app", to: "api", label: "GET" },
    { from: "api", to: "db" },
  ],
  scenarios: [
    {
      id: "screen",
      name: "One screen, three calls",
      steps: [
        { edge: "app>api", caption: "The profile screen needs the user. GET /users/7: 80 ms." },
        { edge: "app>api", caption: "Then their orders. GET /users/7/orders: another 80 ms, because it needs the user id first." },
        { edge: "app>api", caption: "Then the items of the latest order. GET /orders/9/items. Three round trips, about 240 ms of network before the screen is complete." },
        { edge: "api>db", caption: "Each response also carries fields the screen never shows. Simple and cacheable, but chatty." },
      ],
    },
  ],
};

export const graphqlFlow: FlowSpec = {
  id: "graphql-flow",
  title: "GraphQL: the client names the fields",
  description: "One query describes the whole screen. The server resolves the fields in parallel and returns exactly that shape.",
  nodes: [
    { id: "app", label: "Mobile app", kind: "client", col: 0, row: 1 },
    { id: "gql", label: "GraphQL server", kind: "gateway", col: 1, row: 1 },
    { id: "users", label: "Users service", kind: "service", col: 2, row: 0 },
    { id: "orders", label: "Orders service", kind: "service", col: 2, row: 1 },
    { id: "items", label: "Items DB", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "app", to: "gql", label: "POST" },
    { from: "gql", to: "users" },
    { from: "gql", to: "orders" },
    { from: "gql", to: "items" },
  ],
  scenarios: [
    {
      id: "one-query",
      name: "One query",
      steps: [
        { edge: "app>gql", caption: "One request asks for user name, last 5 orders and each order's first item: 80 ms round trip, once." },
        { edge: "gql>users", caption: "The server resolves the fields, in parallel where it can.", with: [{ edge: "gql>orders", caption: "" }, { edge: "gql>items", caption: "" }] },
        { edge: "app>gql", reverse: true, tone: "ok", caption: "One response with exactly the requested fields: about 80 ms of network instead of 240." },
      ],
    },
    {
      id: "n-plus-1",
      name: "The N+1 trap",
      steps: [
        { edge: "app>gql", caption: "A query asks for 20 orders and each order's customer." },
        { edge: "gql>orders", caption: "One query loads the 20 orders." },
        { edge: "gql>users", tone: "error", caption: "Then a naive resolver fetches the customer separately for each order: 20 more queries, 21 in total.", with: [{ edge: "gql>users", tone: "error", caption: "" }, { edge: "gql>users", tone: "error", caption: "" }], mark: [{ node: "users", state: "busy" }] },
        { edge: "gql>users", tone: "ok", caption: "Fix: a batching loader collects the 20 ids and issues one query. 21 queries become 2.", mark: [{ node: "users", state: "ok" }] },
      ],
    },
  ],
};

export const grpcFlow: FlowSpec = {
  id: "grpc-flow",
  title: "gRPC: typed calls between services",
  description: "gRPC sends compact Protobuf messages over a long-lived HTTP/2 connection, with generated clients. Browsers need a gRPC-Web proxy.",
  nodes: [
    { id: "browser", label: "Browser", kind: "client", col: 0, row: 0 },
    { id: "proxy", label: "gRPC-Web proxy", kind: "gateway", col: 1, row: 0 },
    { id: "orders", label: "Orders service", kind: "service", col: 2, row: 1 },
    { id: "pay", label: "Payments service", kind: "service", col: 3, row: 1 },
  ],
  edges: [
    { from: "browser", to: "proxy", label: "gRPC-Web" },
    { from: "proxy", to: "orders" },
    { from: "orders", to: "pay", label: "gRPC" },
  ],
  scenarios: [
    {
      id: "internal",
      name: "Service to service",
      steps: [
        { edge: "orders>pay", caption: "Orders calls Payments.Charge(amount, orderId). The method and fields come from a shared .proto file, so both sides are generated and type-checked." },
        { edge: "orders>pay", caption: "Many calls share one HTTP/2 connection, multiplexed, with a binary payload smaller than the same JSON." },
        { edge: "orders>pay", reverse: true, tone: "ok", caption: "Reply returned. Note that one long connection pins to one server behind an L4 balancer: use an L7 balancer or client-side balancing." },
      ],
    },
    {
      id: "browser",
      name: "From a browser",
      steps: [
        { edge: "browser>proxy", caption: "Browsers cannot speak raw gRPC: they have no control over HTTP/2 frames." },
        { edge: "proxy>orders", caption: "A proxy (Envoy, for example) translates gRPC-Web into gRPC. It works, but it is an extra moving part." },
        { edge: "browser>proxy", reverse: true, caption: "That is why gRPC stays internal and public APIs stay REST." },
      ],
    },
  ],
};

export const wsFlow: FlowSpec = {
  id: "ws-flow",
  title: "WebSockets need a way across servers",
  description: "A WebSocket is a long-lived two-way connection. Alice and Bob sit on different servers, so the servers need a pub/sub channel between them.",
  nodes: [
    { id: "alice", label: "Alice", kind: "client", col: 0, row: 0 },
    { id: "bob", label: "Bob", kind: "client", col: 0, row: 2 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1, sub: "L7, upgrades" },
    { id: "s1", label: "Chat server 1", kind: "service", col: 2, row: 0 },
    { id: "s2", label: "Chat server 2", kind: "service", col: 2, row: 2 },
    { id: "bus", label: "Pub/sub", kind: "pubsub", col: 3, row: 1 },
  ],
  edges: [
    { from: "alice", to: "lb" },
    { from: "bob", to: "lb" },
    { from: "lb", to: "s1" },
    { from: "lb", to: "s2" },
    { from: "s1", to: "bus", style: "async" },
    { from: "s2", to: "bus", style: "async" },
  ],
  scenarios: [
    {
      id: "message",
      name: "A message across servers",
      steps: [
        { edge: "alice>lb", caption: "Alice's socket was upgraded once and stays open. The balancer routed it to Chat server 1." },
        { edge: "lb>s1", caption: "She sends a message to Bob over that open socket." },
        { edge: "s1>bus", caption: "Server 1 does not hold Bob's socket, so it publishes the message to the pub/sub channel." },
        { edge: "s2>bus", reverse: true, caption: "Server 2 holds Bob's socket and receives it." },
        { edge: "lb>s2", reverse: true, tone: "ok", caption: "It pushes the message down Bob's socket.", with: [{ edge: "bob>lb", reverse: true, tone: "ok", caption: "" }] },
      ],
    },
    {
      id: "deploy",
      name: "A deploy drops sockets",
      steps: [
        { edge: "lb>s1", tone: "error", caption: "Deploying server 1 closes its 50,000 open sockets at once.", mark: [{ node: "s1", state: "down" }] },
        { edge: "alice>lb", tone: "miss", caption: "All 50,000 clients reconnect in the same second.", with: [{ edge: "alice>lb", tone: "miss", caption: "" }, { edge: "alice>lb", tone: "miss", caption: "" }], mark: [{ node: "lb", state: "busy" }] },
        { edge: "lb>s2", caption: "Fix: drain gradually and have clients reconnect with random jitter, so the herd arrives over 30 seconds.", mark: [{ node: "lb", state: null }, { node: "s2", state: "ok" }] },
      ],
    },
  ],
};

export const sseSeq: SequenceSpec = {
  id: "sse-seq",
  title: "Server-sent events",
  description: "The client opens one ordinary HTTP request and the server keeps the response open, writing events as they happen. The browser reconnects by itself.",
  actors: [
    { id: "client", label: "Browser", kind: "client" },
    { id: "server", label: "Server", kind: "service" },
  ],
  items: [
    { from: "client", to: "server", label: "GET /events (Accept: text/event-stream)", type: "call" },
    { from: "server", to: "client", label: "200, connection stays open", type: "reply" },
    { from: "server", to: "client", label: "id: 41  data: score 2-1", type: "async" },
    { from: "server", to: "client", label: "id: 42  data: score 3-1", type: "async" },
    { note: "The connection drops (a train enters a tunnel).", over: ["client", "server"] },
    { from: "client", to: "server", label: "GET /events + Last-Event-ID: 42", type: "call" },
    { from: "server", to: "client", label: "replays everything after 42", type: "async" },
  ],
};

export const apiPick: DecisionSpec = {
  id: "api-pick",
  title: "Which API style?",
  start: "push",
  nodes: {
    push: { q: "Does the server push updates?", yes: "both", no: "public" },
    both: { q: "Does the client stream messages too?", yes: "ws", no: "sse" },
    public: { q: "Public or browser-facing API?", yes: "rest", no: "internal" },
    internal: { q: "Internal, latency-critical or streaming?", yes: "grpc", no: "shapes" },
    shapes: { q: "Clients need different fields?", yes: "graphql", no: "rest2" },
    rest: { result: "REST over JSON", why: "The default. Works everywhere, caches by URL, easy to debug with curl." },
    rest2: { result: "REST over JSON", why: "One client shape, so nothing here beats the default. Keep it simple." },
    graphql: { result: "GraphQL", why: "Clients pick the fields. Budget for N+1 resolvers, query cost limits and weaker HTTP caching." },
    grpc: { result: "gRPC", why: "Typed contracts, small Protobuf payloads, HTTP/2 streaming. Internal only, or behind gRPC-Web." },
    ws: { result: "WebSocket", why: "Full duplex and low latency, but stateful: plan sticky routing, pub/sub across servers and reconnect jitter." },
    sse: { result: "Server-sent events", why: "Plain HTTP, automatic reconnect, one direction. Enough for notifications, scores and streamed LLM tokens." },
  },
};

/* ---------- Gateway and BFF ---------- */

export const gatewayFlow: FlowSpec = {
  id: "gateway-flow",
  title: "The gateway handles the shared chores",
  description: "The API gateway authenticates, rate limits and routes, so rejected requests never reach a service and services contain only business logic.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "gw", label: "API gateway", kind: "gateway", col: 1, row: 1, sub: "auth, limits, routing" },
    { id: "orders", label: "Orders", kind: "service", col: 2, row: 0 },
    { id: "users", label: "Users", kind: "service", col: 2, row: 1 },
    { id: "search", label: "Search", kind: "search", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "gw" },
    { from: "gw", to: "orders" },
    { from: "gw", to: "users" },
    { from: "gw", to: "search" },
  ],
  scenarios: [
    {
      id: "allowed",
      name: "Allowed",
      steps: [
        { edge: "client>gw", caption: "GET /orders/123 with a bearer token." },
        { edge: "gw>orders", caption: "The gateway verifies the token, checks the caller's rate limit, and routes /orders to the orders service." },
        { edge: "gw>orders", reverse: true, tone: "ok", caption: "The service returns data and never wrote any auth code." },
      ],
    },
    {
      id: "rejected",
      name: "Rejected early",
      steps: [
        { edge: "client>gw", caption: "A caller sends 300 requests in a second against a limit of 100." },
        { edge: "client>gw", reverse: true, tone: "error", caption: "The gateway answers 429 with Retry-After: 1. No service saw those requests." },
        { edge: "client>gw", caption: "A caller with an expired token gets 401 at the same door, before anything expensive runs." },
      ],
    },
  ],
};

export const bffFlow: FlowSpec = {
  id: "bff-flow",
  title: "A backend for frontend per client type",
  description: "Web and mobile need different payloads from the same services. A thin BFF per client type shapes the response so the services stay general.",
  nodes: [
    { id: "web", label: "Web app", kind: "client", col: 0, row: 0 },
    { id: "mobile", label: "Mobile app", kind: "client", col: 0, row: 2 },
    { id: "webbff", label: "Web BFF", kind: "gateway", col: 1, row: 0, sub: "full detail" },
    { id: "mobbff", label: "Mobile BFF", kind: "gateway", col: 1, row: 2, sub: "6 fields" },
    { id: "products", label: "Products", kind: "service", col: 2, row: 0 },
    { id: "reviews", label: "Reviews", kind: "service", col: 2, row: 2 },
  ],
  edges: [
    { from: "web", to: "webbff" },
    { from: "mobile", to: "mobbff" },
    { from: "webbff", to: "products" },
    { from: "webbff", to: "reviews" },
    { from: "mobbff", to: "products" },
    { from: "mobbff", to: "reviews" },
  ],
  scenarios: [
    {
      id: "shapes",
      name: "Two shapes, same data",
      steps: [
        { edge: "web>webbff", caption: "The web product page wants everything: specs, 20 reviews, related items." },
        { edge: "webbff>products", caption: "The web BFF calls products and reviews and merges them into one rich response.", with: [{ edge: "webbff>reviews", caption: "" }] },
        { edge: "mobile>mobbff", caption: "The phone, on a slow connection, wants a title, a price, a photo and a rating." },
        { edge: "mobbff>products", caption: "The mobile BFF calls the same services but trims the answer to 6 fields.", with: [{ edge: "mobbff>reviews", caption: "" }] },
        { edge: "mobile>mobbff", reverse: true, tone: "ok", caption: "Services stay general. Each client team owns the shaping layer for its own screens." },
      ],
    },
  ],
};

export const pickLayer: DecisionSpec = {
  id: "pick-layer",
  title: "L4 or L7?",
  start: "read",
  nodes: {
    read: { q: "Must it read URLs or headers?", yes: "l7", no: "proto" },
    proto: { q: "Raw TCP or UDP traffic?", yes: "l4", no: "http" },
    http: { q: "Plain HTTP, fewest parts?", yes: "l7b", no: "l4b" },
    l7: { result: "L7 balancer", why: "Routing, TLS termination, retries and gradual rollouts all need to see the request." },
    l7b: { result: "L7 balancer", why: "A managed one (ALB, for example) is the default for HTTP services." },
    l4: { result: "L4 balancer", why: "Fast forwarding for any protocol, with very little CPU per connection." },
    l4b: { result: "L4 in front of L7", why: "At large scale, an L4 tier gives one stable IP and spreads connections over a proxy fleet." },
  },
};
