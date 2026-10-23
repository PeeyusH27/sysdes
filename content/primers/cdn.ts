import type { Primer } from "./types";

export const primer: Primer = {
  id: "cdn",
  title: "What is a CDN?",
  idea: "Keep copies of your images and pages in many cities, so each visitor gets them from somewhere close.",
  doodle: "cdn",
  analogy:
    "Shops spread around the world. You walk to the nearest one for your goods instead of travelling all the way to the factory.",
  flow: {
    id: "primer-cdn",
    title: "One far server, or a copy nearby",
    description: "Without a CDN every visitor reaches one faraway server. With one, a copy close to them answers.",
    nodes: [
      { id: "visitor", label: "Visitor", kind: "client", col: 0, row: 1 },
      { id: "copy", label: "Nearby copy", kind: "cdn", col: 1, row: 0 },
      { id: "origin", label: "Main server", kind: "service", col: 2, row: 1 },
    ],
    edges: [
      { from: "visitor", to: "origin" },
      { from: "visitor", to: "copy" },
      { from: "copy", to: "origin" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a CDN",
        steps: [
          { edge: "visitor>origin", caption: "A visitor in Sydney opens your page. Your only server is in Virginia." },
          {
            edge: "visitor>origin",
            reverse: true,
            tone: "error",
            caption: "Each round trip takes about 200 ms, and a page needs many.",
            mark: [{ node: "visitor", state: "busy" }],
          },
          {
            edge: "visitor>origin",
            tone: "error",
            caption: "Visitors from everywhere all reach that one server.",
            with: [{ edge: "visitor>origin", tone: "error", caption: "" }, { edge: "visitor>origin", tone: "error", caption: "" }],
            mark: [{ node: "origin", state: "busy" }],
          },
        ],
      },
      {
        id: "with",
        name: "With a CDN",
        steps: [
          { edge: "visitor>copy", caption: "Now the visitor asks a copy of your site in a nearby city.", mark: [{ node: "origin", state: null }, { node: "visitor", state: null }] },
          { edge: "visitor>copy", reverse: true, tone: "ok", caption: "The copy has the image. It answers in about 20 ms.", mark: [{ node: "copy", state: "hit" }] },
          { edge: "visitor>copy", tone: "miss", caption: "A file nobody asked for yet: the copy does not have it.", mark: [{ node: "copy", state: "miss" }] },
          { edge: "copy>origin", caption: "The copy fetches it once from the main server." },
          { edge: "copy>origin", reverse: true, caption: "The main server sends it. The copy keeps it.", mark: [{ node: "copy", state: "hit" }] },
          { edge: "visitor>copy", reverse: true, tone: "ok", caption: "Everyone nearby now gets that file fast. The main server stays calm." },
        ],
      },
      {
        id: "old",
        name: "When the copy is old",
        steps: [
          { edge: "copy>origin", caption: "You replace the logo on the main server.", mark: [{ node: "copy", state: null }] },
          { edge: "visitor>copy", caption: "A visitor asks the nearby copy for the logo." },
          {
            edge: "visitor>copy",
            reverse: true,
            tone: "error",
            caption: "The copy still holds the old logo.",
            mark: [{ node: "copy", state: "down" }],
          },
          { edge: "copy>origin", caption: "You order a refresh (a purge), or the copy expires on its own." },
          { edge: "copy>origin", reverse: true, caption: "The copy fetches the new logo.", mark: [{ node: "copy", state: "hit" }] },
          { edge: "visitor>copy", reverse: true, tone: "ok", caption: "Visitors now see the new logo." },
        ],
      },
    ],
  },
  remember: [
    "A CDN serves copies of your files from close to the visitor.",
    "Closer means faster, and your main server gets less traffic.",
    "Old copies linger, so you need a way to refresh them.",
  ],
  whenToUse: "When visitors are far away and the files rarely change, like Sydney to Virginia. Skip it if all visitors live nearby.",
  theCatch: "You replace the logo, but copies in other cities keep serving the old one until they expire or you purge them.",
  say: "I would put static assets behind a CDN with long cache lifetimes and versioned file names. For urgent changes, I can purge the copy.",
  learnMore: [{ href: "/learn/caching", label: "Caching" }],
};
