import { arr, defineTrace, note, stack } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

const OPENER: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

export const bracketMatch = defineTrace({
  id: "bracket-match",
  title: "Matching brackets: the newest open bracket closes first",
  description: "Opening brackets are pushed onto a stack; each closing bracket pops the top and must be its partner, and the string is balanced only if the stack ends empty.",
  code: `
function isBalanced(s) {
  const PAIRS = new Map([[")", "("], ["]", "["], ["}", "{"]]);
  const stack = [];                            //@init
  for (const ch of s) {
    if (PAIRS.has(ch)) {
      const open = stack.pop();                //@pop
      if (open !== PAIRS.get(ch)) return false; //@bad
    } else {
      stack.push(ch);                          //@push
    }
  }
  return stack.length === 0;                   //@done
}`,
  presets: [
    { label: "Nested", input: { s: "{[()]}" } },
    { label: "Crossed pairs", input: { s: "([)]" } },
    { label: "Left open", input: { s: "(()" } },
  ],
  fields: { s: { chars: "()\\[\\]{}", maxLength: 12, help: "Brackets only: ( ) [ ] { }, up to 12." } },
  run(t, { s }) {
    const chars = [...s];
    const st: string[] = [];
    const at: number[] = []; // index in s of each bracket on the stack
    const done: Record<number, Tone> = {};
    const view = (i: number | null, tones: Record<number, Tone> = {}, stackTones: Record<number, Tone> = {}) => [
      arr("s", chars, { pointers: i === null ? {} : { i }, tones: { ...done, ...tones } }),
      stack("stack", st, { tones: stackTones }),
    ];
    t.step("init", "Start with an empty stack. It will hold the opening brackets that are still waiting to be closed.", { views: view(null), vars: { size: 0 } });
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch in OPENER) {
        const want = OPENER[ch];
        if (st.length === 0) {
          t.step("pop", `${ch} closes something, but the stack is empty: nothing is open, so pop() gives undefined.`, { views: view(i, { [i]: "bad" }), vars: { ch, open: "undefined" } });
          t.step("bad", `undefined is not ${want}, so the brackets are not balanced. Return false.`, { views: [...view(i, { [i]: "bad" }), note("Answer: false", "bad")], vars: { ch } });
          return;
        }
        const top = st.length - 1;
        const open = st[top];
        const j = at[top];
        if (open === want) {
          t.step("pop", `${ch} must close the most recently opened bracket, which is the top: ${open} at index ${j}. They are partners, so pop it.`, {
            views: view(i, { [i]: "found", [j]: "found" }, { [top]: "found" }),
            vars: { ch, open },
          });
          st.pop();
          at.pop();
          done[i] = "done";
          done[j] = "done";
        } else {
          t.step("pop", `${ch} must close the most recently opened bracket, but the top is ${open} at index ${j}. The pairs cross instead of nesting.`, {
            views: view(i, { [i]: "bad", [j]: "bad" }, { [top]: "bad" }),
            vars: { ch, open },
          });
          st.pop();
          at.pop();
          t.step("bad", `The partner of ${ch} is ${want}, not ${open}. Return false right away: no later character can repair a crossing.`, { views: [...view(i, { [i]: "bad", [j]: "bad" }), note("Answer: false", "bad")], vars: { ch, open } });
          return;
        }
      } else {
        st.push(ch);
        at.push(i);
        t.step("push", `${ch} opens a new pair. Push it: it must be closed before anything that was opened earlier.`, { views: view(i, { [i]: "active" }, { [st.length - 1]: "new" }), vars: { ch, size: st.length } });
      }
    }
    if (st.length === 0) {
      t.step("done", "Every closer matched the top of the stack and the stack is empty: the brackets are balanced.", { views: [...view(null), note("Answer: true", "found")], vars: { size: 0 } });
    } else {
      t.step("done", `The scan is over but ${st.join(" ")} is still on the stack: opened and never closed. Return false.`, {
        views: [...view(null, Object.fromEntries(at.map((k) => [k, "bad" as Tone])), Object.fromEntries(st.map((_, k) => [k, "bad" as Tone]))), note("Answer: false", "bad")],
        vars: { size: st.length },
      });
    }
  },
});

export const nextGreater = defineTrace({
  id: "next-greater-stack",
  title: "Monotonic decreasing stack: next greater element",
  description: "Indices wait on a stack whose values decrease from bottom to top; each new value pops and resolves every smaller waiting value, so all next-greater answers are found in one pass.",
  code: `
function nextGreaterIndex(nums) {
  const answer = new Array(nums.length).fill(-1);
  const stack = [];                                  //@init
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack.at(-1)] < nums[i]) {
      answer[stack.pop()] = i;                       //@pop
    }
    stack.push(i);                                   //@push
  }
  return answer;                                     //@done
}`,
  presets: [
    { label: "Mixed values", input: { nums: [5, 2, 3, 1, 6, 4] } },
    { label: "Equal values", input: { nums: [3, 3, 1, 4] } },
  ],
  fields: { nums: { maxItems: 10 } },
  run(t, { nums }) {
    const answer: number[] = nums.map(() => -1);
    const st: number[] = [];
    const resolved = new Set<number>();
    const views = (i: number | null, numTones: Record<number, Tone> = {}, ansTones: Record<number, Tone> = {}, stTones: Record<number, Tone> = {}) => {
      const tones: Record<number, Tone> = {};
      resolved.forEach((j) => (tones[j] = "done"));
      st.forEach((j) => (tones[j] = "window"));
      return [
        arr("nums", nums, { pointers: i === null ? {} : { i }, tones: { ...tones, ...numTones } }),
        stack("stack (index: value)", st.map((j) => `${j}: ${nums[j]}`), { tones: stTones }),
        arr("answer (index of next greater)", answer, { tones: ansTones }),
      ];
    };
    t.step("init", "Every answer starts as -1. The stack will hold indices that are still waiting for a bigger value to their right.", { views: views(null), vars: { i: null } });
    for (let i = 0; i < nums.length; i++) {
      while (st.length && nums[st[st.length - 1]] < nums[i]) {
        const j = st[st.length - 1];
        answer[j] = i;
        t.step("pop", `${nums[j]} on top is smaller than ${nums[i]}, and nothing between them was bigger (or ${nums[j]} would be gone already). So index ${i} is the next greater for index ${j}: pop it.`, {
          views: views(i, { [i]: "active", [j]: "found" }, { [j]: "new" }, { [st.length - 1]: "found" }),
          vars: { i, popped: j },
        });
        st.pop();
        resolved.add(j);
      }
      const topVal = st.length ? nums[st[st.length - 1]] : null;
      const why =
        topVal === null
          ? "The stack is empty, so nothing else is waiting."
          : topVal === nums[i]
            ? `${topVal} on top equals ${nums[i]}. Equal is not greater, so it stays and both wait together.`
            : `${topVal} on top is bigger than ${nums[i]}, so popping stops.`;
      st.push(i);
      t.step("push", `${why} Push index ${i}: it waits for a bigger value to its right.`, {
        views: views(i, { [i]: "active" }, {}, { [st.length - 1]: "new" }),
        vars: { i, waiting: st.length },
      });
    }
    const left = st.length === 1 ? `Index ${st[0]} is still on the stack: nothing to its right is bigger, so it keeps -1.` : `Indices ${st.join(", ")} are still on the stack: nothing to their right is bigger, so they keep -1.`;
    t.step("done", `${left} Each index was pushed once and popped at most once: O(n).`, {
      views: [...views(null, {}, Object.fromEntries(answer.map((_, k) => [k, "found" as Tone]))), note(`Answer: [${answer.join(", ")}]`, "found")],
      vars: { i: null },
    });
  },
});

export const smallerNeighbours = defineTrace({
  id: "smaller-neighbours-stack",
  title: "Monotonic increasing stack: nearest smaller on both sides",
  description: "An increasing stack of indices: a smaller new value pops taller ones, which resolves their right neighbour, and whatever is left on top is the new value's left neighbour.",
  code: `
function smallerNeighbours(nums) {
  const n = nums.length;
  const left = new Array(n).fill(-1);
  const right = new Array(n).fill(n);
  const stack = [];                                 //@init
  for (let i = 0; i < n; i++) {
    while (stack.length && nums[stack.at(-1)] > nums[i]) {
      right[stack.pop()] = i;                       //@pop
    }
    left[i] = stack.length ? stack.at(-1) : -1;     //@left
    stack.push(i);                                  //@push
  }
  return { left, right };                           //@done
}`,
  presets: [
    { label: "Distinct values", input: { nums: [4, 6, 5, 2, 7, 3] } },
    { label: "Ties", input: { nums: [3, 1, 3, 3, 0] } },
  ],
  fields: { nums: { maxItems: 10 } },
  run(t, { nums }) {
    const n = nums.length;
    const left: number[] = nums.map(() => -1);
    const right: number[] = nums.map(() => n);
    const st: number[] = [];
    const views = (i: number | null, numTones: Record<number, Tone> = {}, leftTones: Record<number, Tone> = {}, rightTones: Record<number, Tone> = {}, stTones: Record<number, Tone> = {}) => {
      const tones: Record<number, Tone> = {};
      st.forEach((j) => (tones[j] = "window"));
      return [
        arr("nums", nums, { pointers: i === null ? {} : { i }, tones: { ...tones, ...numTones } }),
        stack("stack (index: value)", st.map((j) => `${j}: ${nums[j]}`), { tones: stTones }),
        arr("left (nearest not larger)", left, { tones: leftTones }),
        arr("right (first smaller)", right, { tones: rightTones }),
      ];
    };
    t.step("init", `left starts at -1 and right at n = ${n}, meaning "no smaller neighbour". The stack will keep indices whose values never go down from bottom to top.`, { views: views(null), vars: { i: null } });
    for (let i = 0; i < n; i++) {
      while (st.length && nums[st[st.length - 1]] > nums[i]) {
        const j = st[st.length - 1];
        right[j] = i;
        t.step("pop", `${nums[i]} is smaller than ${nums[j]} on top, so ${nums[j]} can't stretch past index ${i}: the first smaller value to its right is at ${i}. Pop index ${j}.`, {
          views: views(i, { [i]: "active", [j]: "found" }, {}, { [j]: "new" }, { [st.length - 1]: "found" }),
          vars: { i, popped: j },
        });
        st.pop();
      }
      left[i] = st.length ? st[st.length - 1] : -1;
      const top = st.length ? st[st.length - 1] : -1;
      const caption =
        top === -1
          ? `The stack is empty: nothing to the left of index ${i} is smaller than or equal to ${nums[i]}, so left[${i}] stays -1.`
          : nums[top] === nums[i]
            ? `${nums[top]} on top equals ${nums[i]}, so it isn't popped (only larger values are). It is the nearest value to the left that is not larger: left[${i}] = ${top}.`
            : top === i - 1
              ? `${nums[top]} at index ${top}, right next to it, is smaller than ${nums[i]}: left[${i}] = ${top}.`
              : `Everything between index ${top} and index ${i} was larger and has been popped, so ${nums[top]} at index ${top} is the nearest smaller value on the left: left[${i}] = ${top}.`;
      t.step("left", caption, { views: views(i, { [i]: "active", ...(top >= 0 ? { [top]: "compare" } : {}) }, { [i]: "new" }), vars: { i, "left[i]": left[i] } });
      st.push(i);
      t.step("push", `Push index ${i}. Values on the stack still never go down from bottom to top, and ${nums[i]} waits for a smaller value to its right.`, { views: views(i, { [i]: "active" }, {}, {}, { [st.length - 1]: "new" }), vars: { i, waiting: st.length } });
    }
    const never = st.length === 1 ? `Index ${st[0]} is never popped: no smaller value follows it, so its right stays n = ${n}.` : `Indices ${st.join(", ")} are never popped: no smaller value follows them, so their right stays n = ${n}.`;
    t.step("done", `${never} One pass found both neighbours of every element.`, {
      views: [...views(null), note(`left = [${left.join(", ")}], right = [${right.join(", ")}]`, "found")],
      vars: { i: null },
    });
  },
});
