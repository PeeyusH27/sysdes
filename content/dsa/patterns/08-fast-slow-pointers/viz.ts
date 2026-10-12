import { arr, buildList, defineTrace, linked, note, span, type LNode } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

/** Pointer map without null entries (a null pointer would be drawn on the "null" ghost at the left). */
const ptrs = (p: Record<string, LNode | null>) => Object.fromEntries(Object.entries(p).filter(([, n]) => n !== null)) as Record<string, LNode>;

export const findMiddle = defineTrace({
  id: "find-middle",
  title: "Find the middle: fast moves two nodes per step",
  description: "Slow moves one node and fast moves two nodes per step, so when fast runs out of list, slow is standing on the middle node.",
  code: `
function middleNode(head) {
  let slow = head, fast = head;   //@init
  while (fast && fast.next) {     //@check
    slow = slow.next;             //@slow
    fast = fast.next.next;        //@fast
  }
  return slow;                    //@done
}`,
  presets: [
    { label: "Odd length", input: { values: [1, 2, 3, 4, 5, 6, 7] } },
    { label: "Even length", input: { values: [1, 2, 3, 4, 5, 6] } },
  ],
  run(t, { values }) {
    const nodes = buildList(values);
    let slow: LNode | null = nodes[0];
    let fast: LNode | null = nodes[0];
    let steps = 0;
    const view = (tones: [LNode, Tone][] = []) => linked("list", nodes, { pointers: ptrs({ slow, fast }), tones });
    t.step("init", `Both pointers start on the head. The list has ${values.length} nodes, but the code never needs to know that.`, { views: [view()], vars: { steps, "slow at": slow.val, "fast at": fast.val } });
    while (fast && fast.next) {
      slow = slow!.next;
      steps++;
      t.step("slow", `slow takes one step, to ${slow!.val}. After ${steps} step${steps > 1 ? "s" : ""} it has covered ${steps} node${steps > 1 ? "s" : ""}.`, { views: [view([[slow!, "active"]])], vars: { steps, "slow at": slow!.val, "fast at": fast.val } });
      fast = fast.next.next;
      t.step("fast", fast ? `fast takes two steps, to ${fast.val}: it has covered ${2 * steps} nodes, twice as many as slow.` : `fast takes two steps and runs past the last node to null: it has covered ${2 * steps} nodes, twice as many as slow.`, {
        views: [view([[slow!, "active"], ...(fast ? [[fast, "compare"] as [LNode, Tone]] : [])])],
        vars: { steps, "slow at": slow!.val, "fast at": fast ? fast.val : null },
      });
    }
    t.step("check", fast ? `fast is on the last node (fast.next is null), so it can't take two more steps. Stop.` : "fast is null: it ran off the end. Stop.", {
      views: [view([[slow!, "active"]])],
      vars: { steps, "slow at": slow!.val, "fast at": fast ? fast.val : null },
    });
    const odd = values.length % 2 === 1;
    t.step("done", odd ? `fast covered the whole list while slow covered half of it, so slow is on the middle node, ${slow!.val}.` : `With an even length there are two middles. Because fast jumped past the end, slow is on the second one, ${slow!.val}.`, {
      views: [view([[slow!, "found"]]), note(`Middle: ${slow!.val}`, "found")],
      vars: { steps, "slow at": slow!.val },
    });
  },
});

export const floydCycle = defineTrace({
  id: "floyd-cycle",
  title: "Floyd's cycle detection, then walk to the cycle's entry",
  description: "Slow and fast pointers meet inside the loop; then one pointer restarts at the head and both move one step at a time until they meet at the node where the cycle begins.",
  code: `
function cycleStart(head) {
  let slow = head, fast = head;          //@init
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;               //@move
    if (slow === fast) {                 //@meet
      let entry = head;                  //@reset
      while (entry !== slow) {
        entry = entry.next;
        slow = slow.next;                //@walk
      }
      return entry;                      //@found
    }
  }
  return null;                           //@none
}`,
  presets: [
    { label: "Cycle", input: { values: [3, 8, 5, 1, 9, 4, 7], pos: 2 } },
    { label: "No cycle", input: { values: [1, 2, 3, 4, 5], pos: -1 } },
  ],
  run(t, { values, pos }) {
    const nodes = buildList(values);
    if (pos >= 0) nodes[nodes.length - 1].next = nodes[pos];
    const F = pos;
    const C = values.length - pos;
    const loop = pos >= 0 ? nodes.slice(pos) : [];
    const loopTones = (tone: Tone): [LNode, Tone][] => loop.map((n) => [n, tone]);
    let slow: LNode | null = nodes[0];
    let fast: LNode | null = nodes[0];
    let steps = 0;
    const view = (p: Record<string, LNode | null>, tones: [LNode, Tone][] = []) => linked("list", nodes, { pointers: ptrs(p), tones });
    t.step(
      "init",
      pos >= 0
        ? `Both pointers start on the head. The last node (${values.at(-1)}) links back to ${values[pos]}, but the code can't see that: it only follows next pointers.`
        : "Both pointers start on the head. If there is no loop, fast will reach the end first.",
      { views: [view({ slow, fast })], vars: { steps } },
    );
    while (fast && fast.next) {
      slow = slow!.next;
      fast = fast.next.next;
      steps++;
      if (slow === fast) {
        t.step("move", `slow moves to ${slow!.val} and fast jumps two nodes to ${fast!.val}: the same node.`, { views: [view({ slow, fast }, [[slow!, "pivot"]])], vars: { steps, "slow walked": steps, "fast walked": 2 * steps } });
        const a = (nodes.indexOf(slow!) - pos + C) % C;
        t.step("meet", `They meet ${a} step${a === 1 ? "" : "s"} past the entry (a = ${a}). slow walked F + a = ${F} + ${a} = ${F + a} steps and fast walked ${2 * (F + a)}; the extra ${F + a} is a whole number of laps of the loop (C = ${C}). So F = (whole laps) - a.`, {
          views: [view({ slow, fast }, [...loopTones("window"), [slow!, "pivot"]])],
          vars: { F, C, a },
        });
        let entry: LNode = nodes[0];
        t.step("reset", `Put entry on the head and leave slow on the meeting point. Both are now exactly F = ${F} steps (plus whole laps) from where the loop begins.`, {
          views: [view({ entry, slow }, [...loopTones("window"), [entry, "active"], [slow!, "active"]])],
          vars: { F, C, a },
        });
        let walked = 0;
        while (entry !== slow) {
          entry = entry.next!;
          slow = slow!.next;
          walked++;
          const same = entry === slow;
          t.step("walk", same ? `Both move one step and land on ${entry.val} together, after ${walked} step${walked === 1 ? "" : "s"} = F.` : `Both move one step: entry to ${entry.val}, slow to ${slow!.val}. Still apart.`, {
            views: [view({ entry, slow }, [...loopTones("window"), [entry, same ? "found" : "active"], [slow!, same ? "found" : "active"]])],
            vars: { F, walked },
          });
        }
        t.step("found", `The cycle begins at ${entry.val}. Two pointers and two short walks: O(n) time, O(1) memory.`, { views: [view({ entry }, [...loopTones("window"), [entry, "found"]]), note(`Cycle starts at ${entry.val}`, "found")], vars: { F, C } });
        return;
      }
      t.step("move", fast ? `slow moves one node to ${slow!.val}; fast moves two, to ${fast.val}.` : `slow moves one node to ${slow!.val}; fast moves two and runs off the end.`, {
        views: [view({ slow, fast }, [[slow!, "active"], ...(fast ? [[fast, "compare"] as [LNode, Tone]] : [])])],
        vars: { steps, "slow walked": steps, "fast walked": 2 * steps },
      });
    }
    t.step("none", `fast ${fast ? "is on the last node" : "reached null"}: a list with a loop never ends, so there is no cycle. Return null.`, { views: [view({ slow, fast }), note("No cycle: return null", "bad")], vars: { steps } });
  },
});

export const implicitCycle = defineTrace({
  id: "implicit-cycle",
  title: "Cycles without a list: x → f(x)",
  description: "Floyd's algorithm on a sequence defined by a function given as a lookup table: meet inside the cycle, walk to its start, then walk once around it to measure its length.",
  code: `
function floyd(f, x0) {
  let slow = x0, fast = x0;                       //@init
  do {
    slow = f(slow);
    fast = f(f(fast));                            //@move
  } while (slow !== fast);
  let entry = x0, tail = 0;                       //@reset
  while (entry !== slow) {
    entry = f(entry); slow = f(slow); tail++;     //@walk
  }
  let length = 1;
  for (let x = f(entry); x !== entry; x = f(x)) length++; //@lap
  return { start: entry, tail, length };          //@done
}`,
  presets: [
    { label: "Lookup table", input: { table: [4, 0, 7, 2, 6, 3, 2, 5], x0: 0 } },
    { label: "Squares mod 10", input: { table: [1, 2, 5, 0, 7, 6, 7, 0, 5, 2], x0: 3 } },
  ],
  run(t, { table, x0 }) {
    const f = (x: number) => table[x];
    const seq: number[] = [x0];
    while (seq.length < 10) seq.push(f(seq[seq.length - 1]));
    const label = "f(x) for x = 0, 1, 2, …";
    const view = (p: Record<string, number>, tones: Record<number, Tone> = {}) => arr(label, table, { pointers: p, tones });
    const seqView = (tones: Record<number, Tone> = {}) => arr(`the sequence from x0 = ${x0}`, seq, { tones, indices: false });
    let slow = x0;
    let fast = x0;
    let steps = 0;
    t.step("init", `There are no nodes here: the "next" of x is f(x), read from the table. Following it from ${x0} gives ${seq.slice(0, 8).join(" → ")} → …, which must repeat because there are only ${table.length} possible values.`, {
      views: [view({ slow, fast }, { [x0]: "active" }), seqView()],
      vars: { slow, fast },
    });
    do {
      slow = f(slow);
      fast = f(f(fast));
      steps++;
      t.step("move", slow === fast ? `slow = f(slow) = ${slow} and fast = f(f(fast)) = ${fast}: they meet, so the sequence has entered its cycle.` : `slow = f(slow) = ${slow}; fast = f(f(fast)) = ${fast}. Different values, keep going.`, {
        views: [view({ slow, fast }, slow === fast ? { [slow]: "pivot" } : { [slow]: "active", [fast]: "compare" }), seqView()],
        vars: { slow, fast, steps },
      });
    } while (slow !== fast);
    let entry = x0;
    let tail = 0;
    t.step("reset", `Same argument as for linked lists: x0 and the meeting point ${slow} are equally far from the start of the cycle. Restart entry at ${x0} and move both one step at a time.`, {
      views: [view({ entry, slow }, { [entry]: "active", [slow]: "active" }), seqView()],
      vars: { entry, slow, tail },
    });
    while (entry !== slow) {
      entry = f(entry);
      slow = f(slow);
      tail++;
      t.step("walk", entry === slow ? `entry = ${entry} and slow = ${slow}: they agree, so the cycle starts at ${entry}, ${tail} step${tail === 1 ? "" : "s"} after x0.` : `entry = ${entry}, slow = ${slow}. Not equal yet.`, {
        views: [view({ entry, slow }, entry === slow ? { [entry]: "found" } : { [entry]: "active", [slow]: "active" }), seqView(entry === slow ? span(tail, seq.length - 1, "window") : {})],
        vars: { entry, slow, tail },
      });
    }
    const cycle = [entry];
    let length = 1;
    for (let x = f(entry); x !== entry; x = f(x)) {
      length++;
      cycle.push(x);
      t.step("lap", `Walk around the cycle to measure it: ${cycle.join(" → ")} so far, length ${length}.`, {
        views: [view({ x }, Object.fromEntries(cycle.map((c) => [c, "window" as Tone]))), seqView(span(tail, seq.length - 1, "window"))],
        vars: { start: entry, length },
      });
    }
    const tailTones: Record<number, Tone> = { ...span(0, tail - 1, "muted"), ...span(tail, seq.length - 1, "window") };
    t.step("done", `The sequence runs ${tail} step${tail === 1 ? "" : "s"} into a cycle of length ${length} that starts at ${entry}. Happy Number and Find the Duplicate are exactly this, with f = digit-square sum and f(i) = nums[i].`, {
      views: [view({}, Object.fromEntries(cycle.map((c) => [c, "found" as Tone]))), seqView(tailTones), note(`start ${entry}, tail ${tail}, length ${length}`, "found")],
      vars: { start: entry, tail, length },
    });
  },
});
