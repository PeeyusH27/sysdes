import { arr, defineTrace, grid, heapTree, note } from "@/components/algo/trace";
import type { Tone, View } from "@/components/algo/types";
import { intervalProblem } from "@/components/algo/checks";

type Interval = [number, number];
const fmt = ([s, e]: Interval) => `[${s},${e}]`;

/**
 * A timeline: one row per interval, one column per time point from `from` to `to`.
 * Cells an interval covers hold "■"; `closed` intervals cover their end point, half-open ones stop just before it.
 */
function timeline(label: string, rows: Interval[], from: number, to: number, o: { id?: string; closed?: boolean; rowTones?: Record<number, Tone>; col?: number | null } = {}) {
  const cols = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const covers = ([s, e]: Interval, t: number) => (o.closed === false ? s <= t && t < e : s <= t && t <= e);
  const cells = rows.map((iv) => cols.map((t) => (covers(iv, t) ? "■" : "")));
  const tones: [number, number, Tone][] = [];
  rows.forEach((iv, r) =>
    cols.forEach((t, c) => {
      if (!covers(iv, t)) return;
      const rowTone = o.rowTones?.[r];
      if (o.col !== undefined && o.col !== null && t === o.col) tones.push([r, c, "active"]);
      else if (rowTone) tones.push([r, c, rowTone]);
    }),
  );
  return grid(label, cells, { id: o.id, rowLabels: rows.map(fmt), colLabels: cols, tones });
}

export const mergeSweep = defineTrace({
  id: "merge-sweep",
  title: "Sort by start, then sweep: merging intervals",
  description: "Intervals are sorted by start and swept left to right; each one either extends the last merged interval or, after a gap, starts a new one.",
  code: `
function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);     //@sort
  const merged = [];                         //@init
  for (const [start, end] of intervals) {    //@loop
    const last = merged.at(-1);
    if (last && start <= last[1]) {          //@check
      last[1] = Math.max(last[1], end);      //@extend
    } else {
      merged.push([start, end]);             //@push
    }
  }
  return merged;                             //@done
}`,
  presets: [
    { label: "Groups with gaps", input: { intervals: [[7, 8], [2, 4], [10, 11], [1, 3], [4, 5]] as Interval[] } },
    { label: "Nested and touching", input: { intervals: [[4, 8], [1, 10], [10, 11], [2, 3]] as Interval[] } },
  ],
  fields: { intervals: { maxItems: 6, min: 0, max: 30, colNames: ["start", "end"], help: "One interval per line: start end (up to 6)." } },
  validate: ({ intervals }) => intervalProblem(intervals, { maxSpan: 15 }),
  run(t, { intervals }) {
    const from = Math.min(...intervals.map((iv) => iv[0]));
    const to = Math.max(...intervals.map((iv) => iv[1]));
    t.step("sort", `In input order, intervals that overlap can be far apart (${fmt(intervals[0])} comes first). Sort by start so overlapping intervals end up next to each other.`, {
      views: [timeline("intervals (input order)", intervals, from, to, { id: "input" })],
    });
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    const merged: Interval[] = [];
    const views = (cur: number | null, curTone: Tone, mergedTone: Tone = "window") => {
      const rowTones: Record<number, Tone> = {};
      sorted.forEach((_, r) => (rowTones[r] = cur === null || r < cur ? "done" : r === cur ? curTone : "muted"));
      const out: View[] = [timeline("sorted by start", sorted, from, to, { id: "input", rowTones })];
      const mTones: Record<number, Tone> = {};
      merged.forEach((_, r) => (mTones[r] = r === merged.length - 1 ? mergedTone : "found"));
      out.push(merged.length ? timeline("merged", merged, from, to, { id: "merged", rowTones: mTones }) : note("merged: (empty)", undefined, "merged"));
      return out;
    };
    t.step("init", "Sorted. Now sweep from left to right. The last interval in merged is the group still being built; everything before it is final.", { views: views(null, "active") });
    sorted.forEach(([start, end], i) => {
      const last = merged.at(-1);
      if (last && start <= last[1]) {
        t.step("check", `${fmt([start, end])} starts at ${start}, which is not after the open group's end (${last[1]}), so they overlap.`, { views: views(i, "active"), vars: { start, end, lastEnd: last[1] } });
        const grew = end > last[1];
        last[1] = Math.max(last[1], end);
        t.step(
          "extend",
          grew ? `Stretch the group's end to ${last[1]}: it now covers everything from ${last[0]} to ${last[1]}.` : `${fmt([start, end])} lies completely inside ${fmt(last)}. Taking max(${last[1]}, ${end}) keeps the end at ${last[1]}; writing end = ${end} would shrink the group.`,
          { views: views(i, "done", "new"), vars: { start, end, lastEnd: last[1] } },
        );
      } else {
        t.step(
          "check",
          last ? `${fmt([start, end])} starts at ${start}, after the open group ends at ${last[1]}. Every later interval starts even further right, so ${fmt(last)} is final.` : `merged is empty, so ${fmt([start, end])} starts the first group.`,
          { views: views(i, "active", last ? "found" : "window"), vars: { start, end, lastEnd: last ? last[1] : null } },
        );
        merged.push([start, end]);
        t.step("push", `Start a new group with ${fmt([start, end])}.`, { views: views(i, "done", "new"), vars: { start, end, lastEnd: end } });
      }
    });
    t.step("done", `One pass after the sort: ${sorted.length} intervals merged into ${merged.length}: ${merged.map(fmt).join(", ")}.`, {
      views: [...views(null, "done", "found"), note(`Answer: ${merged.map(fmt).join(" ")}`, "found")],
    });
  },
});

export const sweepCount = defineTrace({
  id: "sweep-line-count",
  title: "Sweep line: the most intervals open at once",
  description: "Every interval becomes a +1 event at its start and a -1 event at its end; sorting the events and keeping a running sum gives the number of intervals open at each moment, and its maximum.",
  code: `
function maxOverlap(intervals) {
  const events = [];
  for (const [s, e] of intervals) events.push([s, +1], [e, -1]); //@events
  // by time; at equal times the -1 (an end) goes first
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);              //@sort
  let open = 0, most = 0;                                          //@init
  for (const [time, delta] of events) {                            //@loop
    open += delta;                                                 //@apply
    most = Math.max(most, open);                                   //@best
  }
  return most;                                                     //@done
}`,
  presets: [
    { label: "Busy afternoon", input: { intervals: [[1, 5], [2, 6], [4, 8], [6, 9], [8, 10]] as Interval[] } },
    { label: "Back to back", input: { intervals: [[1, 3], [3, 5], [5, 7]] as Interval[] } },
  ],
  fields: { intervals: { maxItems: 6, min: 0, max: 30, colNames: ["start", "end"], help: "One meeting per line: start end (up to 6)." } },
  validate: ({ intervals }) => intervalProblem(intervals, { strict: true, maxSpan: 16 }),
  run(t, { intervals }) {
    const from = Math.min(...intervals.map((iv) => iv[0]));
    const to = Math.max(...intervals.map((iv) => iv[1]));
    const raw: [number, number][] = [];
    for (const [s, e] of intervals) raw.push([s, +1], [e, -1]);
    const evView = (events: [number, number][], i: number | null, tones: Record<number, Tone> = {}) => [
      arr("time", events.map((e) => e[0]), { id: "time", pointers: i === null ? {} : { i }, tones }),
      arr("change", events.map((e) => (e[1] > 0 ? "+1" : "-1")), { id: "change", tones }),
    ];
    const tl = (time: number | null) => timeline("meetings [start, end)", intervals, from, to - 1, { id: "tl", closed: false, col: time, rowTones: Object.fromEntries(intervals.map((_, r) => [r, "window" as Tone])) });
    t.step("events", "Turn each meeting into two events: +1 when it starts, -1 when it ends. The meetings themselves no longer matter, only these moments.", {
      views: [tl(null), ...evView(raw, null)],
    });
    const events = [...raw].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const ties = events.some((e, k) => k > 0 && e[0] === events[k - 1][0]);
    t.step("sort", `Sort the events by time.${ties ? " When an end and a start share a time, the end (-1) goes first: a room freed at that moment can be reused at once." : ""}`, {
      views: [tl(null), ...evView(events, null)],
    });
    let open = 0;
    let most = 0;
    let bestAt: number | null = null;
    t.step("init", "Sweep from left to right. open is how many meetings are running right now; most is the highest it has been.", { views: [tl(null), ...evView(events, 0)], vars: { open, most } });
    events.forEach(([time, delta], i) => {
      open += delta;
      const tones: Record<number, Tone> = {};
      for (let k = 0; k < i; k++) tones[k] = "done";
      tones[i] = delta > 0 ? "new" : "compare";
      if (open > most) {
        most = open;
        bestAt = time;
        t.step("best", `At time ${time} a meeting starts: open = ${open}. That is a new high, so most = ${most}.${most === 1 ? ` The highlighted column shows the meetings running at that moment.` : ""}`, {
          views: [tl(time), ...evView(events, i, tones)],
          vars: { time, open, most },
        });
      } else {
        const tieNext = delta < 0 && events[i + 1]?.[0] === time && events[i + 1][1] > 0;
        t.step("apply", delta > 0 ? `At time ${time} a meeting starts: open = ${open}, not above the best so far (${most}).` : `At time ${time} a meeting ends: open drops to ${open}.${tieNext ? " It is handled before the start at the same time, so the two never count as overlapping." : ""}`, {
          views: [tl(delta > 0 ? time : null), ...evView(events, i, tones)],
          vars: { time, open, most },
        });
      }
    });
    t.step("done", `Every event is processed and open is back to 0. At most ${most} meeting${most === 1 ? "" : "s"} ran at the same time (first reached at time ${bestAt}), so ${most} room${most === 1 ? " is" : "s are"} enough.`, {
      views: [tl(bestAt), ...evView(events, null, Object.fromEntries(events.map((_, k) => [k, "done" as Tone]))), note(`Answer: ${most}`, "found")],
      vars: { open, most },
    });
  },
});

export const roomsHeap = defineTrace({
  id: "rooms-min-heap",
  title: "Min-heap of end times: reuse the room that frees up first",
  description: "Meetings are taken in start order; a min-heap holds the end time of each room's current meeting, so the room that frees up first is always on top and can be reused.",
  code: `
function minRooms(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);        //@sort
  const ends = new MinHeap();                   //@init
  for (const [start, end] of intervals) {       //@loop
    if (ends.size && ends.peek() <= start) {    //@check
      ends.pop();                               //@reuse
    }
    ends.push(end);                             //@push
  }
  return ends.size;                             //@done
}`,
  presets: [{ label: "Five meetings", input: { intervals: [[2, 7], [0, 5], [6, 9], [1, 3], [4, 6]] as Interval[] } }],
  fields: { intervals: { maxItems: 7, min: 0, max: 99, colNames: ["start", "end"], help: "One meeting per line: start end (up to 7)." } },
  validate: ({ intervals }) => intervalProblem(intervals, { strict: true }),
  run(t, { intervals }) {
    const heap: number[] = [];
    const push = (x: number) => {
      heap.push(x);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p] <= heap[i]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l] < heap[m]) m = l;
          if (r < heap.length && heap[r] < heap[m]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    const meetings = (cur: number | null, tone: Tone = "active") =>
      arr("meetings (by start)", sorted.map(fmt), { id: "meetings", pointers: cur === null ? {} : { cur }, tones: Object.fromEntries(sorted.map((_, i) => [i, cur === null || i < cur ? "done" : i === cur ? tone : "muted"])) });
    const heapViews = (tones: Record<number, Tone> = {}) => (heap.length ? [heapTree("ends (min-heap)", heap, { id: "heap", tones })] : [note("ends: (empty heap)", undefined, "heap")]);
    t.step("sort", "Take the meetings in order of start time. The heap will hold one end time per room in use, smallest on top.", {
      views: [arr("meetings (input)", intervals.map(fmt), { id: "meetings" }), ...heapViews()],
    });
    t.step("init", "Sorted by start, and no rooms are open yet.", { views: [meetings(null), ...heapViews()], vars: { rooms: 0 } });
    sorted.forEach(([start, end], i) => {
      if (heap.length) {
        const top = heap[0];
        const free = top <= start;
        t.step("check", free ? `${fmt([start, end])} starts at ${start}. The earliest-ending room frees up at ${top}, which is not after ${start}: that room is free.` : `${fmt([start, end])} starts at ${start}, but even the earliest-ending room is busy until ${top}. Every room is busy, so this meeting needs a new one.`, {
          views: [meetings(i), ...heapViews({ 0: free ? "found" : "bad" })],
          vars: { start, end, rooms: heap.length },
        });
        if (free) {
          pop();
          t.step("reuse", `Pop ${top}: that room is handed over to the new meeting.`, { views: [meetings(i), ...heapViews()], vars: { start, end, rooms: heap.length } });
        }
      }
      const first = heap.length === 0 && i === 0;
      push(end);
      const at = heap.indexOf(end);
      t.step("push", `${first ? `No room is open yet, so ${fmt([start, end])} gets the first one. ` : ""}Push ${end}, the time this meeting's room frees up. Rooms in use: ${heap.length}.`, {
        views: [meetings(i, "done"), ...heapViews({ [at]: "new" })],
        vars: { start, end, rooms: heap.length },
      });
    });
    t.step("done", `Every meeting has a room. The heap never had to grow past ${heap.length}, so ${heap.length} rooms are enough. Its size is the answer.`, {
      views: [meetings(null), ...heapViews(), note(`Answer: ${heap.length}`, "found")],
      vars: { rooms: heap.length },
    });
  },
});
