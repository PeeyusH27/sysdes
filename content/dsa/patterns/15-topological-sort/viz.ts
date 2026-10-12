import { arr, defineTrace, graph, note, queue, stack } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

interface DagInput {
  n: number;
  edges: [number, number][];
  pos: [number, number][];
}

const list = (xs: number[]) => (xs.length === 1 ? `${xs[0]}` : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export const kahn = defineTrace({
  id: "kahn",
  title: "Kahn's algorithm: take whatever has no prerequisites left",
  description: "In-degrees count each node's unplaced prerequisites; nodes with in-degree 0 wait in a queue, and placing one lowers the in-degree of the nodes it points to.",
  code: `
function topoSortKahn(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [from, to] of edges) {
    adj[from].push(to);
    indegree[to]++;                                     //@count
  }
  const queue = [];
  for (let v = 0; v < n; v++) if (indegree[v] === 0) queue.push(v); //@seed
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);                                      //@take
    for (const v of adj[u]) {
      indegree[v]--;                                    //@relax
      if (indegree[v] === 0) queue.push(v);             //@ready
    }
  }
  return order.length === n ? order : [];               //@done
}`,
  presets: [
    {
      label: "A valid order exists",
      input: {
        n: 7,
        edges: [[3, 5], [0, 5], [0, 1], [5, 6], [1, 6], [1, 2], [6, 4], [2, 4]],
        pos: [[6, 22], [36, 22], [64, 22], [6, 78], [94, 50], [36, 78], [64, 78]],
      } as DagInput,
    },
    {
      label: "A cycle",
      input: {
        n: 6,
        edges: [[0, 1], [0, 4], [1, 2], [2, 3], [3, 1], [3, 5], [4, 5]],
        pos: [[6, 45], [34, 20], [64, 6], [64, 50], [34, 88], [94, 75]],
      } as DagInput,
    },
  ],
  run(t, { n, edges, pos }) {
    const adj: number[][] = Array.from({ length: n }, () => []);
    const indegree = new Array(n).fill(0);
    for (const [from, to] of edges) {
      adj[from].push(to);
      indegree[to]++;
    }
    const q: number[] = [];
    const order: number[] = [];
    let head = 0;
    const placed = new Set<number>();
    const g = { nodes: pos.map(([x, y], id) => ({ id, x, y })), edges: edges.map(([from, to]) => ({ from, to })), directed: true };

    const views = (cur: number | null, edge: [number, number] | null = null, leftover: number[] = []) => {
      const waiting = new Set(q.slice(head));
      const tones: [number, Tone][] = [];
      for (let v = 0; v < n; v++) {
        if (v === cur) tones.push([v, "active"]);
        else if (placed.has(v)) tones.push([v, "done"]);
        else if (waiting.has(v)) tones.push([v, "new"]);
        else if (leftover.includes(v)) tones.push([v, "bad"]);
      }
      const edgeTones: [number, number, Tone][] = [];
      for (const [a, b] of edges) {
        if (placed.has(a)) edgeTones.push([a, b, "muted"]);
        else if (leftover.includes(a) && leftover.includes(b)) edgeTones.push([a, b, "bad"]);
      }
      if (edge) edgeTones.push([edge[0], edge[1], "active"]);
      const badges: [number, string][] = [];
      for (let v = 0; v < n; v++) if (!placed.has(v)) badges.push([v, `in ${indegree[v]}`]);
      return [graph("graph", g, { tones, edgeTones, badges }), queue("queue", q.slice(head)), arr("order", order)];
    };

    t.step("count", "Count every node's incoming edges. A node's in-degree is the number of nodes that must come before it and haven't been placed yet.", {
      views: views(null),
      vars: { placed: 0, n },
    });
    for (let v = 0; v < n; v++) if (indegree[v] === 0) q.push(v);
    t.step("seed", `${list(q)} ${q.length === 1 ? "has" : "have"} in-degree 0: nothing has to come before ${q.length === 1 ? "it" : "them"}, so ${q.length === 1 ? "it starts" : "they start"} the queue.`, {
      views: views(null),
      vars: { placed: 0, n },
    });
    let firstRelax = true;
    let firstReady = true;
    while (head < q.length) {
      const u = q[head];
      head++;
      order.push(u);
      placed.add(u);
      const takeText = order.length === 1 ? `Take ${u} from the queue and append it to the order. Everything that had to come before ${u} is already placed.` : `Take ${u} and append it to the order.`;
      t.step("take", takeText, {
        views: views(u),
        vars: { head, u, placed: order.length },
      });
      for (const v of adj[u]) {
        indegree[v]--;
        if (indegree[v] === 0) {
          q.push(v);
          const readyText = firstReady ? `The edge ${u} → ${v} is used up, so ${v}'s in-degree drops to 0: every node it waited for is placed. Enqueue ${v}.` : `${u} → ${v}: ${v}'s in-degree drops to 0. Enqueue ${v}.`;
          firstReady = false;
          t.step("ready", readyText, {
            views: views(u, [u, v]),
            vars: { head, u, v, "indegree[v]": 0 },
          });
        } else {
          const text = firstRelax
            ? `The edge ${u} → ${v} is used up, so ${v}'s in-degree drops to ${indegree[v]}. ${v} still waits for ${indegree[v]} more node${indegree[v] === 1 ? "" : "s"}, so it can't be placed yet.`
            : `${u} → ${v}: ${v}'s in-degree drops to ${indegree[v]}. Not ready yet.`;
          firstRelax = false;
          t.step("relax", text, { views: views(u, [u, v]), vars: { head, u, v, "indegree[v]": indegree[v] } });
        }
      }
    }
    if (order.length === n) {
      t.step("done", `The queue is empty and all ${n} nodes are placed. Each node entered the queue only after all its prerequisites, so every edge points forward in the order.`, {
        views: [...views(null), note(`Order: [${order.join(", ")}]`, "found")],
        vars: { placed: order.length, n },
      });
    } else {
      const leftover = Array.from({ length: n }, (_, v) => v).filter((v) => !placed.has(v));
      // Walk backwards along edges between leftover nodes until a node repeats: that loop is a cycle.
      const walk: number[] = [leftover[0]];
      while (walk.indexOf(walk[walk.length - 1]) === walk.length - 1) {
        const last = walk[walk.length - 1];
        walk.push(edges.find(([a, b]) => b === last && leftover.includes(a))![0]);
      }
      const loop = walk.slice(walk.indexOf(walk[walk.length - 1])).reverse();
      t.step("done", `The queue is empty but only ${order.length} of ${n} nodes are placed. Each of ${list(leftover)} still waits for another leftover node, which forces a cycle (${loop.join(" → ")} here). Return [].`, {
        views: [...views(null, null, leftover), note("Cycle: no order exists", "bad")],
        vars: { placed: order.length, n },
      });
    }
  },
});

interface DfsInput {
  adj: number[][];
  pos: [number, number][];
}

export const dfsColors = defineTrace({
  id: "dfs-colors",
  title: "DFS with three colours: finishing order and back edges",
  description: "Gray marks nodes on the current DFS path and black marks finished nodes; an edge into a gray node is a cycle, and the reversed finishing order is a topological order.",
  code: `
function topoSortDfs(n, adj) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  const finished = [];                                     //@init
  function visit(u) {
    color[u] = GRAY;                                       //@enter
    for (const v of adj[u]) {
      if (color[v] === GRAY) return false;                 //@back
      if (color[v] === WHITE && !visit(v)) return false;   //@edge
    }
    color[u] = BLACK;                                      //@exit
    finished.push(u);
    return true;
  }
  for (let u = 0; u < n; u++)
    if (color[u] === WHITE && !visit(u)) return [];        //@start
  return finished.reverse();                               //@done
}`,
  presets: [
    {
      label: "A DAG",
      input: { adj: [[1, 2], [3], [3], [4], [], [4]], pos: [[6, 40], [34, 10], [34, 72], [62, 40], [92, 68], [62, 96]] } as DfsInput,
    },
    {
      label: "A back edge",
      input: { adj: [[1, 3], [2], [3], [1]], pos: [[8, 50], [40, 15], [90, 25], [62, 82]] } as DfsInput,
    },
  ],
  run(t, { adj, pos }) {
    const n = adj.length;
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Array(n).fill(WHITE);
    const finished: number[] = [];
    const path: number[] = [];
    const edges = adj.flatMap((outs, u) => outs.map((v) => ({ from: u, to: v })));
    const g = { nodes: pos.map(([x, y], id) => ({ id, x, y })), edges, directed: true };
    const said = new Set<string>();
    const once = (key: string, long: string, short: string) => {
      if (said.has(key)) return short;
      said.add(key);
      return long;
    };

    const views = (cur: number | null, edge: [number, number] | null = null, edgeTone: Tone = "active", bad: number | null = null) => {
      const tones: [number, Tone][] = [];
      const badges: [number, string][] = [];
      for (let v = 0; v < n; v++) {
        if (color[v] === GRAY) {
          tones.push([v, v === cur ? "active" : "window"]);
          badges.push([v, "gray"]);
        } else if (color[v] === BLACK) {
          tones.push([v, "done"]);
          badges.push([v, "black"]);
        }
      }
      if (bad !== null) tones.push([bad, "bad"]);
      const edgeTones: [number, number, Tone][] = [];
      for (let i = 1; i < path.length; i++) edgeTones.push([path[i - 1], path[i], "window"]);
      if (edge) edgeTones.push([edge[0], edge[1], edgeTone]);
      return [graph("graph", g, { tones, edgeTones, badges }), stack("path (call stack)", [...path]), arr("finished", finished)];
    };

    t.step("init", "Every node starts white (not visited). Gray will mean \"on the current path\", black \"finished, along with everything after it\".", {
      views: views(null),
      vars: { finished: finished.length },
    });

    let cycle = false;
    const visit = (u: number): boolean => {
      color[u] = GRAY;
      path.push(u);
      t.step("enter", once("enter", `Colour ${u} gray and push it on the path. It stays gray until every node reachable from it is finished.`, `Enter ${u}: gray.`), {
        views: views(u),
        vars: { u },
      });
      for (const v of adj[u]) {
        if (color[v] === GRAY) {
          cycle = true;
          t.step("back", `${u} → ${v} leads to ${v}, which is gray: it is still on the current path. Following the edge would go round ${path.slice(path.indexOf(v)).join(" → ")} → ${v} forever. That's a cycle, so stop.`, {
            views: views(u, [u, v], "bad", v),
            vars: { u, v },
          });
          return false;
        }
        if (color[v] === BLACK) {
          t.step("edge", once("black", `${u} → ${v}: ${v} is already black, so it and everything after it are finished. That's not a cycle, just two routes to the same node: skip it.`, `${u} → ${v}: ${v} is black, skip it.`), {
            views: views(u, [u, v], "compare"),
            vars: { u, v },
          });
          continue;
        }
        t.step("edge", once("white", `${u} → ${v}: ${v} is white, so visit it. The search goes deep before it comes back to ${u}'s other edges.`, `${u} → ${v}: ${v} is white, visit it.`), {
          views: views(u, [u, v]),
          vars: { u, v },
        });
        if (!visit(v)) return false;
      }
      color[u] = BLACK;
      path.pop();
      finished.push(u);
      t.step("exit", once("exit", `Every edge out of ${u} is done, so everything that must come after ${u} has already finished. Colour it black and append it to finished.`, `${u} is finished: black, append it.`), {
        views: views(u),
        vars: { u },
      });
      return true;
    };

    for (let u = 0; u < n; u++) {
      if (color[u] !== WHITE) continue;
      t.step("start", u === 0 ? `Start a DFS from ${u}, the first white node.` : `Back in the outer loop: ${u} is still white, so start another DFS from it.`, { views: views(null), vars: { u } });
      if (!visit(u)) break;
    }
    if (cycle) {
      t.step("start", "visit returned false all the way up, so return []: a graph with a cycle has no topological order.", {
        views: [...views(null), note("Cycle: return []", "bad")],
        vars: { finished: finished.length },
      });
      return;
    }
    const order = [...finished].reverse();
    t.step("done", `Reverse finished to get [${order.join(", ")}]. Every node finished after all the nodes it points to, so in reverse every edge points forward.`, {
      views: [...views(null), note(`Order: [${order.join(", ")}]`, "found")],
      vars: { finished: finished.length },
    });
  },
});
