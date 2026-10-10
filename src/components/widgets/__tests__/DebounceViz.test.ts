import { test, expect } from "vitest";
import { debounceTimeline, keyLabel, type Keystroke } from "../DebounceViz";

const typed = (word: string, gap: number, start = 0): Keystroke[] => word.split("").map((_, i) => ({ t: start + i * gap, value: word.slice(0, i + 1) }));

test("fast typing resets the timer; one request fires after the pause", () => {
  const keys = typed("system", 100);
  const tl = debounceTimeline(keys, 300, [200], 10_000);
  expect(tl.timers.filter((t) => t.state === "reset")).toHaveLength(5);
  expect(tl.requests).toHaveLength(1);
  expect(tl.requests[0]).toMatchObject({ at: 500 + 300, query: "system", arrive: 1_000, status: "applied" });
  expect(tl.shown).toBe("system");
});

test("no debounce: every keystroke fires", () => {
  const tl = debounceTimeline(typed("abc", 100), 0, [50], 10_000);
  expect(tl.requests.map((r) => r.query)).toEqual(["a", "ab", "abc"]);
});

test("a newer request aborts the one still in flight", () => {
  // two pauses: "sys" fires at 500 ms, "system" fires at 1 100 + 300 = 1 400 ms; the first reply takes 1 100 ms
  const keys = [...typed("sys", 100), ...typed("system", 100, 600).slice(3)];
  const tl = debounceTimeline(keys, 300, [1_100, 100], 10_000, true);
  expect(tl.requests.map((r) => r.status)).toEqual(["aborted", "applied"]);
  expect(tl.requests[0].abortedAt).toBe(tl.requests[1].at);
  expect(tl.shown).toBe("system");
  expect(tl.shownIsStale).toBe(false);
});

test("without aborting, a slow old reply lands last and shows stale results", () => {
  const keys = [...typed("sys", 100), ...typed("system", 100, 600).slice(3)];
  const tl = debounceTimeline(keys, 300, [1_100, 100], 10_000, false);
  expect(tl.requests.map((r) => r.status)).toEqual(["stale", "applied"]);
  expect(tl.shown).toBe("sys");
  expect(tl.shownIsStale).toBe(true);
});

test("before the timer runs out nothing has fired, and the next wake-up is the timer's end", () => {
  const tl = debounceTimeline(typed("ab", 100), 300, [200], 250);
  expect(tl.requests).toHaveLength(0);
  expect(tl.timers.at(-1)?.state).toBe("running");
  expect(tl.nextEventAt).toBe(400);
  const later = debounceTimeline(typed("ab", 100), 300, [200], 450);
  expect(later.requests[0].status).toBe("pending");
  expect(later.nextEventAt).toBe(600);
});

test("keyLabel shows the typed character, space and deletions", () => {
  expect(keyLabel("sy", "sys")).toBe("s");
  expect(keyLabel("sys", "sys ")).toBe("␣");
  expect(keyLabel("sys", "sy")).toBe("⌫");
});
