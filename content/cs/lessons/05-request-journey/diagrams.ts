import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const urlJourney: SequenceSpec = {
  id: "url-journey",
  title: "From typing a URL to the first response byte",
  description: "The browser resolves the name to an address, opens a TCP connection, sets up TLS, then sends the HTTP request. Each stage waits at least one round trip.",
  actors: [
    { id: "browser", label: "Browser", kind: "client" },
    { id: "resolver", label: "DNS resolver", kind: "dns" },
    { id: "server", label: "Server", kind: "service" },
  ],
  items: [
    { from: "browser", to: "resolver", label: "address of example.com?", type: "call" },
    { from: "resolver", to: "browser", label: "93.184.216.34, TTL 300 s", type: "reply" },
    { note: "DNS: 1 round trip when not cached", over: ["browser", "resolver"] },
    { from: "browser", to: "server", label: "SYN", type: "call" },
    { from: "server", to: "browser", label: "SYN-ACK", type: "reply" },
    { note: "TCP handshake: 1 round trip", over: ["browser", "server"] },
    { from: "browser", to: "server", label: "ACK + ClientHello (key share)", type: "call" },
    { from: "server", to: "browser", label: "ServerHello, certificate, Finished", type: "reply" },
    { note: "TLS 1.3 handshake: 1 round trip", over: ["browser", "server"] },
    { from: "browser", to: "server", label: "Finished + GET /", type: "call" },
    { from: "server", to: "browser", label: "200 OK + HTML", type: "reply" },
  ],
};

export const dnsLookup: FlowSpec = {
  id: "dns-lookup",
  title: "Resolving www.example.com",
  description: "The browser asks its resolver. On a cold cache the resolver asks a root server, then the .com server, then the domain's own name server, and caches the answer for its TTL.",
  nodes: [
    { id: "browser", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "resolver", label: "Resolver", kind: "dns", col: 1, row: 1, sub: "caches by TTL" },
    { id: "root", label: "Root server", kind: "dns", col: 2, row: 0 },
    { id: "tld", label: ".com server", kind: "dns", col: 2, row: 1 },
    { id: "auth", label: "Authoritative", kind: "dns", col: 2, row: 2, sub: "example.com" },
  ],
  edges: [
    { from: "browser", to: "resolver" },
    { from: "resolver", to: "root" },
    { from: "resolver", to: "tld" },
    { from: "resolver", to: "auth" },
  ],
  scenarios: [
    {
      id: "cold",
      name: "Cold cache",
      steps: [
        { edge: "browser>resolver", caption: "Browser asks: address of www.example.com?" },
        { edge: "resolver>root", caption: "Resolver asks a root server. It does not know, but points to the .com servers." },
        { edge: "resolver>root", reverse: true, caption: "Referral: ask the .com servers." },
        { edge: "resolver>tld", caption: "Resolver asks a .com server, which points to example.com's name server." },
        { edge: "resolver>auth", caption: "Resolver asks the authoritative server for the real answer." },
        { edge: "resolver>auth", reverse: true, tone: "ok", caption: "93.184.216.34, valid for 300 seconds." },
        { edge: "browser>resolver", reverse: true, tone: "ok", caption: "Answer returned and cached in the resolver." },
      ],
    },
    {
      id: "cached",
      name: "Cached",
      steps: [
        { edge: "browser>resolver", caption: "Browser asks again within the TTL." },
        { edge: "browser>resolver", reverse: true, tone: "ok", caption: "Answered straight from the resolver's cache. No other server is asked.", mark: [{ node: "resolver", state: "hit" }] },
      ],
    },
  ],
};
