import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "HTTP forgets you",
      line: "The server sees each request alone, so it needs a way to remember who you are.",
      scene: {
        kind: "versus",
        left: { title: "Request 1 logs in", points: ["Server replies OK", "Then forgets you"] },
        right: { title: "Request 2", points: ["Looks anonymous", "Asks for login again"] },
      },
    },
    {
      tag: "idea",
      head: "A cookie carries an ID",
      line: "The browser returns it every time. Attributes limit the damage if it leaks.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "HttpOnly", tone: "good", why: "Hidden from page scripts" },
          { label: "Secure", tone: "good", why: "Sent over HTTPS only" },
          { label: "SameSite=Lax", tone: "good", why: "Blocks most CSRF" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Session or JWT?",
      line: "One keeps state on the server. The other puts it in the token.",
      scene: {
        kind: "versus",
        left: { title: "Session", points: ["Revoke instantly", "One lookup a request"] },
        right: { title: "JWT", points: ["No lookup needed", "Valid until it expires"] },
      },
      predict: { q: "A user is banned. Which cuts access now?", options: ["A session", "A JWT"], answer: 0, why: "Delete the session and the next request fails. A JWT stays valid until expiry." },
    },
    {
      tag: "sum",
      head: "Keep tokens short-lived",
      line: "A leaked token works until it expires, so the lifetime is the damage window.",
      scene: {
        kind: "meter",
        label: "Token lifetime",
        unit: "minutes",
        min: 1,
        max: 10080,
        start: 15,
        log: true,
        stops: [
          { upTo: 30, verdict: "Short: a small leak window.", tone: "good" },
          { upTo: 1440, verdict: "A day: risky if leaked.", tone: "warn" },
          { upTo: 10080, verdict: "A week: a leak lasts.", tone: "bad" },
        ],
      },
    },
    {
      tag: "fix",
      head: "L4 or L7?",
      line: "Reading the request costs CPU but unlocks smarter routing.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Route by path", tone: "info", why: "Needs L7" },
          { label: "Terminate TLS", tone: "info", why: "Needs L7" },
          { label: "Raw TCP or UDP", tone: "info", why: "L4 is enough" },
          { label: "Fastest forwarding", tone: "info", why: "L4" },
        ],
      },
    },
    {
      tag: "catch",
      head: "CORS guards browsers only",
      line: "It decides what a page's script may read. Servers and curl ignore it.",
      scene: {
        kind: "versus",
        left: { title: "CORS stops", points: ["Other sites' scripts", "Reading your reply"] },
        right: { title: "CORS ignores", points: ["curl and servers", "Attackers off-browser"] },
      },
    },
  ],
};
