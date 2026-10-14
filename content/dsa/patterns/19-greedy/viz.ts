import { arr, defineTrace, grid, note } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";
import { distinctProblem, intervalProblem } from "@/components/algo/checks";

export const assignCookies = defineTrace({
  id: "assign-cookies",
  title: "Sort, then match: the smallest cookie that satisfies the least greedy child",
  description: "Children and cookies are sorted; each cookie, from smallest to largest, goes to the least greedy child still waiting if it is big enough, and is thrown away otherwise.",
  code: `
function findContentChildren(greed, cookies) {
  greed.sort((a, b) => a - b);                  //@sort
  cookies.sort((a, b) => a - b);
  let child = 0;                                //@init
  for (let c = 0; c < cookies.length && child < greed.length; c++) { //@loop
    if (cookies[c] >= greed[child]) child++;    //@feed
  }
  return child;                                 //@done
}`,
  presets: [
    { label: "Some children miss out", input: { greed: [3, 1, 6, 2, 4], cookies: [2, 1, 5, 3, 1] } },
    { label: "Small cookies wasted", input: { greed: [7, 4, 5], cookies: [3, 1, 6, 2] } },
  ],
  fields: { greed: { min: 1, max: 20, maxItems: 8 }, cookies: { min: 1, max: 20, maxItems: 8 } },
  run(t, { greed, cookies }) {
    t.step("sort", "Each child has a greed factor (the smallest cookie that makes them happy), and each cookie can go to one child. First, sort both lists.", {
      views: [arr("greed", greed), arr("cookies", cookies)],
    });
    greed.sort((a, b) => a - b);
    cookies.sort((a, b) => a - b);
    let child = 0;
    const views = (c: number | null, gTones: Record<number, Tone> = {}, cTones: Record<number, Tone> = {}) => {
      const gt: Record<number, Tone> = {};
      for (let i = 0; i < child; i++) gt[i] = "found";
      const ct: Record<number, Tone> = { ...cTones };
      return [
        arr("greed (sorted)", greed, { id: "greed", pointers: child < greed.length ? { child } : { child: greed.length }, tones: { ...gt, ...gTones } }),
        arr("cookies (sorted)", cookies, { id: "cookies", pointers: c === null ? {} : { c }, tones: ct }),
      ];
    };
    const used: Record<number, Tone> = {};
    let fedOnce = false;
    let wastedOnce = false;
    t.step("init", "Now walk the cookies from smallest to largest, always trying the least greedy child who is still waiting.", { views: views(0), vars: { content: 0 } });
    for (let c = 0; c < cookies.length && child < greed.length; c++) {
      if (cookies[c] >= greed[child]) {
        used[c] = "found";
        t.step("feed", fedOnce ? `Cookie ${cookies[c]} >= greed ${greed[child]}: this child is content.` : `Cookie ${cookies[c]} >= greed ${greed[child]}: give it to this child. Smallest cookie left, least greedy child left: any best assignment can be rearranged to pair them like this without losing a happy child (the exchange argument).`, {
          views: views(c, { [child]: "active" }, { ...used, [c]: "new" }),
          vars: { content: child + 1 },
        });
        fedOnce = true;
        child++;
      } else {
        used[c] = "bad";
        t.step("feed", wastedOnce ? `Cookie ${cookies[c]} < greed ${greed[child]}: too small for anyone left, skip it.` : `Cookie ${cookies[c]} < greed ${greed[child]}. This child is the least greedy one still waiting, so nobody left can use this cookie: throw it away.`, {
          views: views(c, { [child]: "compare" }, used),
          vars: { content: child },
        });
        wastedOnce = true;
      }
    }
    const reason = child === greed.length ? "every child is content" : "no cookies are left";
    t.step("done", `Stop: ${reason}. ${child} of ${greed.length} children ${child === 1 ? "is" : "are"} content, and no other assignment does better.`, {
      views: [...views(null, {}, used), note(`Answer: ${child}`, "found")],
      vars: { content: child },
    });
  },
});

/** Timeline grid for half-open intervals: one row per interval, one column per time unit. */
function timeline(label: string, rows: [number, number][], from: number, to: number, rowTones: Record<number, Tone>) {
  const cols = Array.from({ length: to - from }, (_, i) => from + i);
  const cells = rows.map(([s, e]) => cols.map((x) => (s <= x && x < e ? "■" : "")));
  const tones: [number, number, Tone][] = [];
  rows.forEach(([s, e], r) => cols.forEach((x, c) => s <= x && x < e && rowTones[r] && tones.push([r, c, rowTones[r]])));
  return grid(label, cells, { id: "tl", rowLabels: rows.map(([s, e]) => `[${s},${e})`), colLabels: cols, tones });
}

export const activitySelection = defineTrace({
  id: "interval-scheduling",
  title: "Earliest end first: the most activities that don't overlap",
  description: "Activities are sorted by end time; each one is kept if it starts after the last kept activity ends, which keeps the greedy schedule's finish time ahead of any other schedule.",
  code: `
function maxNonOverlapping(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);    //@sort
  let kept = 0, lastEnd = -Infinity;        //@init
  for (const [start, end] of intervals) {   //@loop
    if (start >= lastEnd) {                 //@check
      kept++;                               //@keep
      lastEnd = end;
    }
  }
  return kept;                              //@done
}`,
  presets: [{ label: "Six activities", input: { intervals: [[5, 9], [1, 3], [6, 8], [2, 5], [8, 10], [4, 6]] as [number, number][] } }],
  fields: { intervals: { maxItems: 7, min: 0, max: 30, colNames: ["start", "end"], help: "One activity per line: start end (up to 7)." } },
  validate: ({ intervals }) => intervalProblem(intervals, { strict: true, maxSpan: 16 }),
  run(t, { intervals }) {
    const from = Math.min(...intervals.map((iv) => iv[0]));
    const to = Math.max(...intervals.map((iv) => iv[1]));
    t.step("sort", "We want as many activities as possible with no two overlapping (one may start exactly when another ends). Sort them by end time.", {
      views: [timeline("activities (input order)", intervals, from, to, {})],
    });
    const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
    const status: Record<number, Tone> = {};
    let kept = 0;
    let lastEnd = -Infinity;
    const view = (cur: number | null) => timeline("sorted by end", sorted, from, to, { ...status, ...(cur === null ? {} : { [cur]: "active" as Tone }) });
    t.step("init", "Nothing kept yet. The rule: take the activity that ends first among those that still fit.", { views: [view(null)], vars: { kept, lastEnd } });
    sorted.forEach(([start, end], i) => {
      if (start >= lastEnd) {
        t.step("check", `[${start},${end}) starts at ${start}, not before the last kept end (${lastEnd === -Infinity ? "none yet" : lastEnd}), so it fits.`, { views: [view(i)], vars: { kept, lastEnd, start, end } });
        kept++;
        lastEnd = end;
        status[i] = "found";
        t.step("keep", kept === 1 ? `Keep it. Of everything that fits, it ends earliest, so our schedule of 1 activity finishes at ${end}: no schedule of 1 activity can finish sooner.` : `Keep it. ${kept} activities, finishing at ${end}: still as early as any schedule of ${kept} activities can finish.`, {
          views: [view(null)],
          vars: { kept, lastEnd, start, end },
        });
      } else {
        status[i] = "bad";
        t.step("check", `[${start},${end}) starts at ${start}, before the last kept activity ends at ${lastEnd}: it overlaps, skip it.`, { views: [view(null)], vars: { kept, lastEnd, start, end } });
      }
    });
    t.step("done", `${kept} activities kept. Because the greedy schedule always finished earliest, it always had at least as much room left as any other: it "stays ahead", so ${kept} is the maximum.`, {
      views: [view(null), note(`Answer: ${kept}`, "found")],
      vars: { kept, lastEnd },
    });
  },
});

export const greedyCoins = defineTrace({
  id: "greedy-coins",
  title: "When greedy fails: making change with the largest coin first",
  description: "Greedy change-making repeatedly takes the largest coin that fits; it is optimal for canonical coin systems like 25, 10, 5, 1 but not for arbitrary ones like 4, 3, 1.",
  code: `
function greedyChange(coins, amount) {
  coins.sort((a, b) => b - a);          //@sort
  const used = [];                      //@init
  for (const coin of coins) {           //@loop
    while (amount >= coin) {            //@fits
      amount -= coin;                   //@take
      used.push(coin);
    }
  }
  return amount === 0 ? used : null;    //@done
}`,
  presets: [
    { label: "Coins 25, 10, 5, 1", input: { coins: [1, 5, 10, 25], amount: 68 } },
    { label: "Coins 4, 3, 1 (fails)", input: { coins: [1, 3, 4], amount: 6 } },
  ],
  fields: { coins: { min: 1, max: 50, maxItems: 5 }, amount: { min: 1, max: 99 } },
  validate: ({ coins }) => distinctProblem("coins", coins) ?? (!coins.includes(1) && "Include a 1 coin, so every amount can be made and greedy can be compared with the best answer."),
  run(t, { coins, amount }) {
    const start = amount;
    // the true optimum, by DP, for the final comparison
    const dp = new Array(start + 1).fill(Infinity);
    const pick = new Array(start + 1).fill(0);
    dp[0] = 0;
    for (let x = 1; x <= start; x++)
      for (const c of coins)
        if (c <= x && dp[x - c] + 1 < dp[x]) {
          dp[x] = dp[x - c] + 1;
          pick[x] = c;
        }
    const best: number[] = [];
    for (let x = start; x > 0; x -= pick[x]) best.push(pick[x]);
    coins.sort((a, b) => b - a);
    const used: number[] = [];
    const views = (ci: number | null, tones: Record<number, Tone> = {}) => [
      arr("coins (largest first)", coins, { id: "coins", pointers: ci === null ? {} : { coin: ci }, tones }),
      used.length ? arr("used", used, { id: "used", tones: { [used.length - 1]: "new" } }) : note("used: (none yet)", undefined, "used"),
    ];
    t.step("sort", `Make ${start} with as few coins as possible. Greedy rule: always take the largest coin that still fits. Sort the coins largest first.`, { views: views(null), vars: { amount } });
    t.step("init", "No coins used yet.", { views: views(0), vars: { amount } });
    coins.forEach((coin, ci) => {
      while (amount >= coin) {
        amount -= coin;
        used.push(coin);
        t.step("take", `${coin} fits: take it. ${amount} left to make.`, { views: views(ci, { [ci]: "active" }), vars: { amount, coins: used.length } });
      }
      if (amount > 0) t.step("fits", `${coin} is bigger than the ${amount} still needed, so move on to the next smaller coin.`, { views: views(ci, { [ci]: "muted" }), vars: { amount, coins: used.length } });
    });
    const optimal = dp[start];
    if (used.length === optimal) {
      t.step("done", `Greedy used ${used.length} coins, and that is the true minimum (a DP over every amount agrees). For this coin system, taking the largest coin is always safe.`, {
        views: [...views(null), note(`Greedy: ${used.length} coins, optimal`, "found")],
        vars: { amount, coins: used.length },
      });
    } else {
      t.step("done", `Greedy used ${used.length} coins, but the minimum is ${optimal}: ${start} = ${best.join(" + ")}. Grabbing the ${used[0]} looked best locally and forced small coins later. Greedy is not safe for this coin system; dynamic programming is.`, {
        views: [...views(null), note(`Greedy: ${used.length} coins, optimal: ${optimal}`, "bad")],
        vars: { amount, coins: used.length },
      });
    }
  },
});
