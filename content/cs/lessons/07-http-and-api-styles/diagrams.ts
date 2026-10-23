import type { DecisionSpec, SequenceSpec } from "@/components/diagram/types";

export const conditionalGet: SequenceSpec = {
  id: "conditional-get",
  title: "HTTP caching: fresh, revalidated, or changed",
  description: "Within max-age the browser answers from its cache with no request. After that it asks with If-None-Match: an unchanged resource returns 304 with no body, a changed one returns 200 with the new body.",
  actors: [
    { id: "browser", label: "Browser", kind: "client" },
    { id: "server", label: "Server", kind: "service" },
  ],
  items: [
    {
      alt: [
        {
          when: "Fresh",
          items: [{ note: "Inside max-age: answered from the browser cache. No request is sent.", over: ["browser", "server"] }],
        },
        {
          when: "Stale, unchanged",
          items: [
            { from: "browser", to: "server", label: "GET /price  If-None-Match: \"a1b2\"", type: "call" },
            { from: "server", to: "browser", label: "304 Not Modified (no body)", type: "reply" },
            { note: "One round trip, almost no bytes. The cached copy is fresh again.", over: ["browser", "server"] },
          ],
        },
        {
          when: "Stale, changed",
          items: [
            { from: "browser", to: "server", label: "GET /price  If-None-Match: \"a1b2\"", type: "call" },
            { from: "server", to: "browser", label: "200 OK + new body + ETag \"c3d4\"", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const apiChoice: DecisionSpec = {
  id: "api-choice",
  title: "REST, gRPC or GraphQL?",
  start: "public",
  nodes: {
    public: { q: "Is it a public API, or called from browsers and third parties?", yes: "rest", no: "internal" },
    internal: { q: "Service to service, with tight latency or streaming?", yes: "grpc", no: "clients" },
    clients: { q: "Many client types that each need different fields?", yes: "graphql", no: "rest" },
    rest: { result: "REST over JSON", why: "Works everywhere, cacheable by URL, easy to debug with curl. The default choice." },
    grpc: { result: "gRPC", why: "Typed contracts, binary protobuf and HTTP/2 streaming. Browsers need a proxy (gRPC-Web)." },
    graphql: { result: "GraphQL", why: "Clients ask for exactly the fields they need. You must handle N+1 queries, cost limits and caching." },
  },
};
