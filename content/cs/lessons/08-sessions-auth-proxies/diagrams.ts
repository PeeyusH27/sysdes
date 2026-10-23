import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const sessionLogin: SequenceSpec = {
  id: "session-login",
  title: "A cookie session: log in once, then show the cookie",
  description: "The server checks the password, stores the session on its side and hands the browser only an opaque ID in a cookie. Every later request carries the cookie and the server looks the session up.",
  actors: [
    { id: "browser", label: "Browser", kind: "client" },
    { id: "app", label: "App server", kind: "service" },
    { id: "store", label: "Session store", kind: "cache" },
  ],
  items: [
    { from: "browser", to: "app", label: "POST /login (email, password)", type: "call" },
    { from: "app", to: "store", label: "SET sess:9f3a = user 42, TTL 30 min", type: "call" },
    { from: "app", to: "browser", label: "Set-Cookie: sid=9f3a; HttpOnly; Secure; SameSite=Lax", type: "reply" },
    { note: "The browser now attaches the cookie to every request to this site", over: ["browser", "app"] },
    { from: "browser", to: "app", label: "GET /account  Cookie: sid=9f3a", type: "call" },
    { from: "app", to: "store", label: "GET sess:9f3a", type: "call" },
    { from: "store", to: "app", label: "user 42", type: "reply" },
    { from: "app", to: "browser", label: "200 OK (account page)", type: "reply" },
  ],
};

export const corsFlow: SequenceSpec = {
  id: "cors-flow",
  title: "CORS: when the browser asks first",
  description: "A simple GET goes straight out and the browser checks the reply headers. A request with a JSON body and an Authorization header is preceded by an OPTIONS preflight asking whether the server allows it.",
  actors: [
    { id: "page", label: "app.example.com", kind: "client" },
    { id: "api", label: "api.example.com", kind: "service" },
  ],
  items: [
    {
      alt: [
        {
          when: "Simple GET",
          items: [
            { from: "page", to: "api", label: "GET /items  Origin: app.example.com", type: "call" },
            { from: "api", to: "page", label: "200 + Access-Control-Allow-Origin: app.example.com", type: "reply" },
            { note: "The browser compares the header with the page's origin and lets the script read the reply", over: ["page", "api"] },
          ],
        },
        {
          when: "Preflighted PUT",
          items: [
            { from: "page", to: "api", label: "OPTIONS /items/7  (may I PUT with Authorization?)", type: "call" },
            { from: "api", to: "page", label: "204 + Allow-Methods, Allow-Headers, Max-Age: 600", type: "reply" },
            { from: "page", to: "api", label: "PUT /items/7  Authorization: Bearer ...", type: "call" },
            { from: "api", to: "page", label: "200 + Access-Control-Allow-Origin", type: "reply" },
          ],
        },
        {
          when: "Not allowed",
          items: [
            { from: "page", to: "api", label: "GET /items  Origin: evil.example", type: "call" },
            { from: "api", to: "page", label: "200, but no Allow-Origin header", type: "reply" },
            { note: "The server did answer. The browser refuses to hand the reply to the script.", over: ["page", "api"] },
          ],
        },
      ],
    },
  ],
};

export const reverseProxy: FlowSpec = {
  id: "reverse-proxy",
  title: "A reverse proxy in front of the servers",
  description: "Clients talk only to the proxy. It terminates TLS, then routes by path: /api goes to the API pool and everything else to the web pool, adding the client's address in a header.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "proxy", label: "Reverse proxy", kind: "lb", col: 1, row: 1, sub: "TLS ends here" },
    { id: "api", label: "API pool", kind: "service", col: 2, row: 0, sub: "x3" },
    { id: "web", label: "Web pool", kind: "service", col: 2, row: 2, sub: "x2" },
  ],
  edges: [
    { from: "client", to: "proxy" },
    { from: "proxy", to: "api" },
    { from: "proxy", to: "web" },
  ],
  scenarios: [
    {
      id: "route",
      name: "Route by path",
      steps: [
        { edge: "client>proxy", caption: "GET https://example.com/api/orders arrives over TLS" },
        { edge: "proxy>api", caption: "The proxy decrypts it, reads the path and forwards to the API pool with X-Forwarded-For: client IP." },
        { edge: "proxy>api", reverse: true, tone: "ok", caption: "The API pool answers the proxy." },
        { edge: "client>proxy", reverse: true, tone: "ok", caption: "The proxy sends the reply back over the original connection." },
        { edge: "client>proxy", caption: "GET /index.html arrives next." },
        { edge: "proxy>web", caption: "Different path, different pool: forwarded to the web servers." },
      ],
    },
  ],
};
