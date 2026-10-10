import type { FlowSpec } from "@/components/diagram/types";

export const feedFlow: FlowSpec = {
  id: "feed-flow",
  title: "Infinite feed: from scroll to new rows",
  description:
    "An IntersectionObserver on a sentinel near the end of the list triggers one cursor-paginated fetch. The page is appended to the query cache, and the virtualized list mounts only the rows near the viewport.",
  nodes: [
    { id: "user", label: "User scrolls", kind: "client", col: 0, row: 1 },
    { id: "sentinel", label: "Sentinel visible", kind: "service", col: 1, row: 1, sub: "or Retry tapped", note: "IntersectionObserver with rootMargin 600px; Retry calls the same loadMore()." },
    { id: "fetch", label: "Fetch next page", kind: "gateway", col: 2, row: 1, sub: "1 in flight", note: "A busy flag reset in finally, plus an AbortController for unmount." },
    { id: "api", label: "Feed API", kind: "service", col: 3, row: 1, sub: "?cursor=&limit=20", note: "Returns { data, nextCursor }; nextCursor is null at the end." },
    { id: "cache", label: "Page cache", kind: "cache", col: 2, row: 0, sub: "infinite query", note: "pages: [{ data, nextCursor }], kept across navigations." },
    { id: "list", label: "Virtualized list", kind: "client", col: 1, row: 0, sub: "~20 rows in DOM", note: "Only visible rows plus overscan are mounted, positioned with transforms." },
  ],
  edges: [
    { from: "user", to: "sentinel", label: "scroll" },
    { from: "sentinel", to: "fetch", label: "loadMore()" },
    { from: "fetch", to: "api", label: "GET /api/feed" },
    { from: "fetch", to: "cache", label: "append page" },
    { from: "cache", to: "list", label: "items" },
    { from: "list", to: "user", label: "new rows" },
  ],
  scenarios: [
    {
      id: "next-page",
      name: "Next page",
      steps: [
        { edge: "user>sentinel", caption: "You scroll. The 1 px sentinel after the last post comes within 600 px of the viewport (rootMargin), well before you reach the end.", ms: 1500 },
        { edge: "sentinel>fetch", caption: "The observer calls loadMore(). Nothing is in flight, so it sets busy and starts one request.", mark: [{ node: "fetch", state: "busy" }] },
        { edge: "fetch>api", caption: "GET /api/feed?cursor=p_160&limit=20. The cursor is the id of the last post you have, not a page number." },
        { edge: "fetch>api", reverse: true, tone: "ok", caption: "20 posts and nextCursor p_140. WHERE id < cursor is an index range scan, as fast deep in the feed as at the top.", ms: 1500 },
        { edge: "fetch>cache", caption: "The page is appended to the cache, the cursor moves to p_140, and finally resets busy.", mark: [{ node: "fetch", state: null }, { node: "cache", state: "ok" }] },
        { edge: "cache>list", caption: "The list now holds 60 posts but mounts only the rows in view plus overscan: about 20 DOM rows." },
        { edge: "list>user", tone: "ok", caption: "The new posts are in place before you get there. No spinner, no jump.", mark: [{ node: "cache", state: null }] },
      ],
    },
    {
      id: "error-retry",
      name: "Error and retry",
      steps: [
        { edge: "user>sentinel", caption: "You keep scrolling and the sentinel becomes visible again." },
        { edge: "sentinel>fetch", caption: "loadMore() starts one request.", mark: [{ node: "fetch", state: "busy" }] },
        { edge: "fetch>api", caption: "GET /api/feed?cursor=p_140&limit=20" },
        { edge: "fetch>api", reverse: true, tone: "error", caption: "503 Service Unavailable. loadMore throws inside its try block.", mark: [{ node: "api", state: "down" }] },
        {
          edge: "cache>list",
          tone: "error",
          caption: "Nothing is appended. status becomes error, and finally still resets busy. The original code skipped that, so one failure froze the feed forever.",
          mark: [{ node: "fetch", state: null }],
          ms: 2000,
        },
        { edge: "list>user", tone: "error", caption: "You see: Couldn't load more posts. Retry. The feed does not retry by itself, so a struggling server isn't hammered." },
        { edge: "user>sentinel", caption: "You tap Retry. It calls the same loadMore()." },
        { edge: "sentinel>fetch", caption: "busy is false again, so the request goes out.", mark: [{ node: "fetch", state: "busy" }, { node: "api", state: null }] },
        { edge: "fetch>api", caption: "The same cursor, p_140: nothing is skipped or duplicated." },
        { edge: "fetch>api", reverse: true, tone: "ok", caption: "200 with the next 20 posts." },
        { edge: "fetch>cache", caption: "Appended.", mark: [{ node: "fetch", state: null }] },
        { edge: "cache>list", tone: "ok", caption: "The Retry button is replaced by posts and the sentinel; scrolling carries on." },
      ],
    },
    {
      id: "end",
      name: "End of list",
      steps: [
        { edge: "user>sentinel", caption: "You reach the oldest posts." },
        { edge: "sentinel>fetch", caption: "loadMore() for the next page.", mark: [{ node: "fetch", state: "busy" }] },
        { edge: "fetch>api", caption: "GET /api/feed?cursor=p_20&limit=20" },
        { edge: "fetch>api", reverse: true, tone: "ok", caption: "12 posts and nextCursor: null. Nothing older exists." },
        { edge: "fetch>cache", caption: "The cursor becomes END and status becomes done. Any later loadMore() returns at once.", mark: [{ node: "fetch", state: null }, { node: "cache", state: "ok" }] },
        { edge: "cache>list", caption: "The sentinel is replaced by a role=status message, and aria-setsize changes from -1 to the real total." },
        { edge: "list>user", caption: "You're all caught up. No more requests, however far you scroll, and the footer is reachable again.", mark: [{ node: "cache", state: null }] },
      ],
    },
    {
      id: "back",
      name: "Back navigation",
      steps: [
        { edge: "list>user", reverse: true, caption: "You open post 87, then press Back. The feed page mounts again.", ms: 1300 },
        { edge: "cache>list", reverse: true, caption: "The list asks the query cache for the ['feed'] key." },
        { edge: "cache>list", tone: "ok", caption: "Hit: all 3 pages (60 posts) come back at once. No request, no spinner.", mark: [{ node: "cache", state: "hit" }], ms: 1500 },
        {
          edge: "list>user",
          tone: "ok",
          caption: "The saved anchor is restored (scrollToIndex for the virtual list, restoreAnchor for a plain one). Post 87 is exactly where you left it.",
          mark: [{ node: "cache", state: null }],
          ms: 2000,
        },
      ],
    },
  ],
};
