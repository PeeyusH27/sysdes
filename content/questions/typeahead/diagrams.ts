import type { FlowSpec } from "@/components/diagram/types";

/* The request path of one keystroke. The cache is checked before the debounce timer starts, exactly as in
   useTypeahead.js: that is what makes backspace instant. */
export const typeaheadFlow: FlowSpec = {
  id: "typeahead-flow",
  title: "From keystroke to suggestion list",
  description:
    "Each keystroke checks the client LRU first. On a miss, a 250 ms debounce timer starts; when it fires, one abortable fetch goes to the suggest API and the results are cached and rendered.",
  nodes: [
    { id: "key", label: "Keystroke", kind: "client", col: 0, row: 1, note: "The input's onChange calls setQuery." },
    { id: "cache", label: "LRU cache", kind: "cache", col: 1, row: 1, sub: "100 entries, 60 s", note: "A Map from query to { items, at }, re-inserted on access." },
    { id: "debounce", label: "Debounce 250ms", kind: "service", col: 2, row: 1, sub: "timer resets", note: "setTimeout in the effect; the effect cleanup clears it." },
    { id: "fetch", label: "Abortable fetch", kind: "gateway", col: 3, row: 1, sub: "AbortController", note: "One controller per query; cleanup calls abort()." },
    { id: "api", label: "Suggest API", kind: "service", col: 4, row: 1, sub: "trie, CDN-cached", note: "GET /api/suggest?q=…&limit=8 with Cache-Control: public, max-age=300." },
    { id: "render", label: "Render list", kind: "client", col: 2, row: 0, sub: "listbox", note: "role=listbox with up to 8 role=option items." },
  ],
  edges: [
    { from: "key", to: "cache", label: "query" },
    { from: "cache", to: "render", label: "hit" },
    { from: "cache", to: "debounce", label: "miss" },
    { from: "debounce", to: "fetch", label: "after pause" },
    { from: "fetch", to: "api", label: "GET /suggest" },
    { from: "fetch", to: "render", label: "items" },
  ],
  scenarios: [
    {
      id: "fast-typing",
      name: "Fast typing",
      steps: [
        { edge: "key>cache", caption: "You type r. One character is under the 2-character minimum, so nothing is scheduled.", ms: 900 },
        { edge: "key>cache", tone: "miss", caption: "You type e. re is not in the cache…", mark: [{ node: "cache", state: "miss" }], ms: 800 },
        { edge: "cache>debounce", caption: "…so a 250 ms timer starts.", mark: [{ node: "debounce", state: "busy" }], ms: 800 },
        {
          edge: "cache>debounce",
          caption: "rea, reac and react arrive about 80 ms apart. Each one clears the previous timer and starts a new one.",
          with: [{ edge: "cache>debounce", caption: "" }, { edge: "cache>debounce", caption: "" }],
          ms: 1500,
        },
        { edge: "debounce>fetch", caption: "You pause. 250 ms pass with no keystroke, so the timer fires once, for react.", mark: [{ node: "debounce", state: null }, { node: "cache", state: null }] },
        { edge: "fetch>api", caption: "One request: GET /api/suggest?q=react&limit=8, carrying an AbortSignal." },
        { edge: "fetch>api", reverse: true, tone: "ok", caption: "8 suggestions come back, often straight from the CDN edge." },
        { edge: "fetch>render", caption: "The hook stores them in the LRU and renders the list. 5 keystrokes, 1 request.", mark: [{ node: "render", state: "ok" }], ms: 1600 },
      ],
    },
    {
      id: "backspace",
      name: "Backspace",
      steps: [
        { edge: "key>cache", caption: "Earlier you paused on react and on reactj, so both lists are cached. Now you press Backspace: the query is react again.", ms: 1500 },
        { edge: "cache>render", tone: "ok", caption: "Hit, fetched 20 s ago and inside the 60 s TTL. The list renders in the same frame: no timer, no request.", mark: [{ node: "cache", state: "hit" }, { node: "render", state: "ok" }], ms: 1600 },
        { edge: "key>cache", tone: "miss", caption: "Backspace again: reac. It was debounced away earlier and never fetched, so it misses.", mark: [{ node: "cache", state: "miss" }, { node: "render", state: null }] },
        { edge: "cache>debounce", caption: "The normal path runs: wait 250 ms, then fetch. The old list stays visible meanwhile.", mark: [{ node: "debounce", state: "busy" }] },
        { edge: "debounce>fetch", caption: "The timer fires for reac.", mark: [{ node: "debounce", state: null }, { node: "cache", state: null }] },
        { edge: "fetch>api", caption: "GET /api/suggest?q=reac" },
        { edge: "fetch>api", reverse: true, tone: "ok", caption: "Results arrive." },
        { edge: "fetch>render", caption: "Cached and rendered. Next time reac is instant too.", mark: [{ node: "render", state: "ok" }] },
      ],
    },
    {
      id: "slow-response",
      name: "Slow response",
      steps: [
        { edge: "debounce>fetch", caption: "You paused on rea, and its timer fired." },
        { edge: "fetch>api", caption: "GET ?q=rea goes out, but the server is slow right now.", mark: [{ node: "api", state: "busy" }], ms: 1300 },
        { edge: "key>cache", caption: "Before it answers, you type c. The query changed, so React first runs the previous effect's cleanup." },
        { edge: "fetch>api", tone: "error", caption: "Cleanup: clearTimeout plus ctrl.abort(). The rea request is cancelled in flight.", mark: [{ node: "fetch", state: "down" }], ms: 1500 },
        {
          edge: "cache>debounce",
          tone: "miss",
          caption: "Then the new effect runs: reac is not cached, so a new 250 ms timer starts.",
          mark: [{ node: "cache", state: "miss" }, { node: "fetch", state: null }, { node: "debounce", state: "busy" }],
        },
        { edge: "debounce>fetch", caption: "It fires.", mark: [{ node: "debounce", state: null }, { node: "cache", state: null }] },
        { edge: "fetch>api", caption: "GET ?q=reac with a fresh AbortController." },
        { edge: "fetch>api", reverse: true, tone: "ok", caption: "reac answers quickly." },
        { edge: "fetch>render", caption: "reac's suggestions render.", mark: [{ node: "render", state: "ok" }] },
        {
          edge: "fetch>api",
          reverse: true,
          tone: "error",
          caption: "If rea's late response still arrives (a server that ignores the abort), its signal is aborted, so the hook drops it. Old results never overwrite new ones.",
          mark: [{ node: "api", state: null }],
          ms: 2000,
        },
      ],
    },
  ],
};

/* The component tree (RADIO: Architecture). */
export const componentTree: FlowSpec = {
  id: "typeahead-tree",
  title: "Typeahead component tree",
  description:
    "Typeahead renders a combobox input and a listbox of options, each with a Highlight. All data logic lives in the useTypeahead hook, which calls the fetchSuggestions prop.",
  nodes: [
    { id: "ta", label: "Typeahead", kind: "client", col: 0, row: 1, sub: "open, active" },
    { id: "input", label: "input", kind: "client", col: 1, row: 0, sub: "role=combobox" },
    { id: "list", label: "ul", kind: "client", col: 1, row: 1, sub: "role=listbox" },
    { id: "hook", label: "useTypeahead", kind: "service", col: 1, row: 2, sub: "debounce, cache, abort" },
    { id: "opt", label: "li ×8", kind: "client", col: 2, row: 1, sub: "role=option" },
    { id: "hl", label: "Highlight", kind: "client", col: 3, row: 1, sub: "mark, no innerHTML" },
    { id: "fetcher", label: "fetchSuggestions", kind: "gateway", col: 2, row: 2, sub: "(q, signal)" },
    { id: "api", label: "GET /api/suggest", kind: "service", col: 3, row: 2 },
  ],
  edges: [
    { from: "ta", to: "input", label: "renders" },
    { from: "ta", to: "list", label: "renders" },
    { from: "ta", to: "hook", label: "calls" },
    { from: "list", to: "opt", label: "items.map" },
    { from: "opt", to: "hl", label: "label" },
    { from: "input", to: "opt", label: "activedescendant" },
    { from: "hook", to: "fetcher" },
    { from: "fetcher", to: "api" },
  ],
  scenarios: [
    {
      id: "typing",
      name: "Typing",
      steps: [
        { edge: "ta>input", reverse: true, caption: "onChange: the input reports rea; Typeahead calls setQuery, opens the popup and resets the active option." },
        { edge: "ta>hook", caption: "useTypeahead sees a new query: a cache miss, so it starts the 250 ms timer.", mark: [{ node: "hook", state: "busy" }] },
        { edge: "hook>fetcher", caption: "The timer fires: fetchSuggestions('rea', signal)." },
        { edge: "fetcher>api", caption: "GET /api/suggest?q=rea&limit=8" },
        { edge: "fetcher>api", reverse: true, tone: "ok", caption: "8 items come back." },
        { edge: "hook>fetcher", reverse: true, caption: "The hook caches them and sets status to success.", mark: [{ node: "hook", state: null }] },
        { edge: "ta>hook", reverse: true, caption: "Typeahead re-renders with the new items." },
        { edge: "ta>list", caption: "The listbox is shown and the input gets aria-expanded=true." },
        { edge: "list>opt", caption: "One option per item, each with a stable id for aria-activedescendant." },
        { edge: "opt>hl", tone: "ok", caption: "Highlight wraps rea in a mark element. React escapes the rest of the label.", mark: [{ node: "hl", state: "ok" }] },
      ],
    },
    {
      id: "keyboard",
      name: "Arrow keys and Enter",
      steps: [
        { edge: "ta>input", reverse: true, caption: "ArrowDown: onKeyDown calls preventDefault (no caret jump) and sets active to 0." },
        { edge: "input>opt", caption: "aria-activedescendant now names option 0. DOM focus never leaves the input, so typing still works.", mark: [{ node: "opt", state: "ok" }] },
        { edge: "list>opt", caption: "Option 0 gets aria-selected=true and the highlight style; the screen reader reads its label." },
        { edge: "ta>input", reverse: true, caption: "Enter: choose(items[0]) calls onSelect, fills the input with the label and closes the popup.", mark: [{ node: "opt", state: null }] },
        { edge: "ta>list", caption: "The listbox is hidden again and aria-expanded is false. Escape would do the same without selecting." },
      ],
    },
    {
      id: "mouse",
      name: "Click an option",
      steps: [
        { edge: "list>opt", reverse: true, caption: "mousedown on an option: preventDefault stops the input from losing focus." },
        { edge: "ta>list", reverse: true, caption: "click: choose(item) runs. Without that preventDefault, blur would close the popup before the click landed.", mark: [{ node: "ta", state: "ok" }] },
        { edge: "ta>input", caption: "The input shows the chosen label and focus is still there.", mark: [{ node: "ta", state: null }] },
      ],
    },
  ],
};
