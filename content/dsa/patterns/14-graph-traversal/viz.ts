import { autoLayout, defineTrace, graph, grid, hashmap, note, queue, stack } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";
import { edgeProblem, gridProblem } from "@/components/algo/checks";

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const cell = (r: number, c: number) => `(${r},${c})`;
const axis = (n: number) => Array.from({ length: n }, (_, i) => i);

export const islandsDfs = defineTrace({
  id: "islands-dfs",
  title: "DFS with a stack: flood each island once",
  description: "A row-by-row scan finds land that no search has reached, counts a new island, and floods all of it with an explicit stack, marking every cell when it is pushed.",
  code: `
function numIslands(grid) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let islands = 0;                                  //@init
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] !== "1") continue;             //@scan
      islands++;                                    //@new
      grid[r][c] = "#";              // mark on push
      const stack = [[r, c]];
      while (stack.length > 0) {                    //@flood
        const [cr, cc] = stack.pop();               //@pop
        for (const [dr, dc] of dirs) {
          const nr = cr + dr, nc = cc + dc;
          if (grid[nr]?.[nc] !== "1") continue;
          grid[nr][nc] = "#";                       //@push
          stack.push([nr, nc]);
        }
      }
    }
  }
  return islands;                                   //@done
}`,
  presets: [
    { label: "Three islands", input: { rows: ["11001", "10011", "00100", "01100"] } },
    { label: "One winding island", input: { rows: ["1110", "0010", "1110", "1000"] } },
  ],
  fields: { rows: { kind: "lines", chars: "01", maxItems: 6, maxLength: 8, help: "One row per line: 1 = land, 0 = water (up to 6 rows of 8)." } },
  validate: ({ rows }) => gridProblem(rows),
  run(t, { rows }) {
    const g = rows.map((row) => [...row]);
    const R = g.length;
    const C = g[0].length;
    let islands = 0;
    const st: [number, number][] = [];
    let skipShown = false;
    let waitShown = false;
    let pops = 0;
    let pushes = 0;

    const views = (cur: [number, number] | null, extra: [number, number, Tone][] = [], stackTone: Tone | null = null) => {
      const inStack = new Set(st.map(([r, c]) => `${r},${c}`));
      const tones: [number, number, Tone][] = [];
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (g[r][c] === "0") tones.push([r, c, "muted"]);
          else if (g[r][c] === "#") tones.push([r, c, inStack.has(`${r},${c}`) ? "new" : "done"]);
        }
      }
      if (cur) tones.push([cur[0], cur[1], "active"]);
      tones.push(...extra);
      return [
        grid("grid", g, { tones, rowLabels: axis(R), colLabels: axis(C) }),
        stack("stack", st.map(([r, c]) => cell(r, c)), { tones: stackTone && st.length ? { [st.length - 1]: stackTone } : {} }),
      ];
    };

    t.step("init", "Scan the grid row by row. Water is greyed out; every \"1\" is land that no search has reached yet.", { views: views(null), vars: { islands } });
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        if (g[r][c] === "#" && !skipShown) {
          skipShown = true;
          t.step("scan", `The scan reaches ${cell(r, c)}. It was land, but the flood already marked it "#", so it is skipped: that is why no island is counted twice.`, {
            views: views([r, c]),
            vars: { islands, r, c },
          });
        }
        if (g[r][c] !== "1") continue;
        islands++;
        g[r][c] = "#";
        st.push([r, c]);
        t.step("new", `${cell(r, c)} is land that no earlier flood reached, so it starts island ${islands}. Mark it and push it onto the stack.`, {
          views: views([r, c], [], "new"),
          vars: { islands, r, c },
        });
        while (st.length > 0) {
          const [cr, cc] = st.pop()!;
          const fresh: [number, number][] = [];
          for (const [dr, dc] of DIRS) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (g[nr]?.[nc] === "1") fresh.push([nr, nc]);
          }
          const why = fresh.length === 0 ? ` ${cell(cr, cc)} has no unmarked land around it, so this branch ends here.` : ` Unmarked land next to ${cell(cr, cc)}: ${fresh.map(([a, b]) => cell(a, b)).join(", ")}.`;
          let lead = `Pop ${cell(cr, cc)}.`;
          if (pops === 0) lead = `Pop ${cell(cr, cc)} from the top of the stack and look at its four neighbours.`;
          else if (st.length > 0 && !waitShown) {
            waitShown = true;
            lead = `Pop ${cell(cr, cc)}, the newest cell. ${cell(...st[st.length - 1])} waits underneath: last in, first out, so DFS finishes the newest branch before going back.`;
          }
          pops++;
          t.step("pop", `${lead}${why}`, {
            views: views([cr, cc]),
            vars: { islands, cr, cc },
          });
          for (const [nr, nc] of fresh) {
            g[nr][nc] = "#";
            st.push([nr, nc]);
            const text = pushes++ === 0 ? `Mark ${cell(nr, nc)} now, as it is pushed, not later when it is popped. Then no other cell can push it a second time.` : `Mark ${cell(nr, nc)} and push it.`;
            t.step("push", text, {
              views: views([cr, cc], [[nr, nc, "new"]], "new"),
              vars: { islands, cr, cc },
            });
          }
        }
        t.step("flood", `The stack is empty: every cell of island ${islands} is marked. Back to the scan.`, { views: views(null), vars: { islands } });
      }
    }
    t.step("done", islands === 1 ? "The scan is finished. It started one flood, so there is one island, however much it bends." : `The scan is finished. It started ${islands} floods, one per island.`, {
      views: [...views(null), note(`Return ${islands}`, "found")],
      vars: { islands },
    });
  },
});

interface GraphInput {
  n: number;
  edges: [number, number][];
  start: number;
  pos: [number, number][];
}

export const bfsLevels = defineTrace({
  id: "bfs-levels",
  title: "BFS: fewest edges from a start node",
  description: "An edge list becomes an adjacency list, then BFS with a head-index queue gives every node its distance from the start, marking each node when it is enqueued.",
  code: `
function bfs(n, edges, start) {
  const adj = Array.from({ length: n }, () => []);  //@build
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const dist = new Array(n).fill(-1);    // -1 = not visited
  dist[start] = 0;
  const queue = [start];                            //@seed
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];                       //@dequeue
    for (const next of adj[node]) {
      if (dist[next] !== -1) continue;              //@seen
      dist[next] = dist[node] + 1;                  //@discover
      queue.push(next);
    }
  }
  return dist;                                      //@done
}`,
  presets: [
    {
      label: "Connected graph",
      input: {
        n: 7,
        edges: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [4, 6]],
        start: 0,
        pos: [[6, 50], [32, 15], [32, 85], [60, 15], [60, 85], [88, 45], [92, 95]],
      } as GraphInput,
    },
    {
      label: "Unreachable nodes",
      input: {
        n: 6,
        edges: [[0, 1], [0, 2], [1, 3], [2, 3], [4, 5]],
        start: 0,
        pos: [[8, 50], [35, 18], [35, 82], [62, 50], [90, 18], [90, 82]],
      } as GraphInput,
    },
  ],
  fields: {
    n: { min: 1, max: 10, help: "Nodes are numbered 0 to n - 1 (up to 10)." },
    edges: { minItems: 0, maxItems: 14, min: 0, max: 9, colNames: ["a", "b"], help: "One undirected edge per line: a b (up to 14)." },
    start: { min: 0, max: 9 },
    pos: false,
  },
  validate: ({ n, edges, start }) => edgeProblem(n, edges) ?? (start >= n && `start must be a node from 0 to ${n - 1}.`),
  // Lay the reader's graph out in BFS layers, so distance from start reads left to right.
  prepare: (input) => ({ ...input, pos: autoLayout(input.n, input.edges, { start: input.start }) }),
  run(t, { n, edges, start, pos }) {
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const [a, b] of edges) {
      adj[a].push(b);
      adj[b].push(a);
    }
    const dist = new Array(n).fill(-1);
    const q: number[] = [];
    let head = 0;
    const tree = new Set<string>(); // edges along which a node was discovered
    let lastDist = 0;
    let found = 0;
    const nodes = pos.map(([x, y], id) => ({ id, x, y }));
    const g = { nodes, edges: edges.map(([from, to]) => ({ from, to })) };

    const views = (cur: number | null, edge: [number, number] | null = null, edgeTone: Tone = "active") => {
      const tones: [number, Tone][] = [];
      for (let v = 0; v < n; v++) {
        if (v === cur) tones.push([v, "active"]);
        else if (dist[v] !== -1 && q.indexOf(v) < head) tones.push([v, "done"]);
        else if (dist[v] !== -1) tones.push([v, "new"]);
      }
      if (cur === null && dist[start] === 0 && head === 0) tones.push([start, "pivot"]);
      const edgeTones: [number, number, Tone][] = [...tree].map((k) => {
        const [a, b] = k.split("-").map(Number);
        return [a, b, "found"] as [number, number, Tone];
      });
      if (edge) edgeTones.push([edge[0], edge[1], edgeTone]);
      const badges: [number, string][] = [];
      for (let v = 0; v < n; v++) if (dist[v] !== -1) badges.push([v, `d=${dist[v]}`]);
      return [
        graph("graph", g, { tones, edgeTones, badges }),
        queue("queue", q.slice(head)),
        hashmap("adj", adj.map((list, v) => [v, list.join(", ") || "—"] as [number, string]), { tones: cur === null ? [] : [[cur, "active"]] }),
      ];
    };

    t.step("build", "Turn the edge list into an adjacency list first. Each undirected edge is stored in both directions, so a node's neighbours are one lookup away.", {
      views: views(null),
      vars: { head },
    });
    dist[start] = 0;
    q.push(start);
    t.step("seed", `Start at ${start} with distance 0. It is marked (given a distance) the moment it enters the queue, like every node after it.`, {
      views: views(null),
      vars: { head, node: start },
    });
    while (head < q.length) {
      const node = q[head];
      let text = `Dequeue ${node} (distance ${dist[node]}) and look at its neighbours.`;
      if (head === 0) text = `Dequeue ${node} and look at its neighbours. The queue only ever holds distances d and d + 1, so nodes leave it in order of distance.`;
      else if (dist[node] > lastDist) text = `Dequeue ${node}. Every node at distance ${lastDist} is finished, so the nodes at distance ${dist[node]} start coming out.`;
      lastDist = dist[node];
      t.step("dequeue", text, {
        views: views(node),
        vars: { head, node },
      });
      head++;
      for (const next of adj[node]) {
        if (dist[next] !== -1) {
          const queued = q.indexOf(next) >= head;
          const why = queued
            ? `${next} is already waiting in the queue with distance ${dist[next]}. Because it was marked when enqueued, it isn't added a second time.`
            : `${next} already has its distance (${dist[next]}), which can't be improved now: skip it.`;
          t.step("seen", why, { views: views(node, [node, next], "compare"), vars: { head, node, next } });
          continue;
        }
        dist[next] = dist[node] + 1;
        q.push(next);
        tree.add(`${node}-${next}`);
        const text = found++ === 0 ? `${next} has no distance yet, so this is the first, and therefore shortest, way to reach it: ${dist[node]} + 1 = ${dist[next]}. Mark it and enqueue it.` : `${next} is new: distance ${dist[node]} + 1 = ${dist[next]}. Mark it and enqueue it.`;
        t.step("discover", text, {
          views: views(node, [node, next], "found"),
          vars: { head, node, next },
        });
      }
    }
    const missing = dist.map((d, v) => (d === -1 ? v : -1)).filter((v) => v >= 0);
    const tail = missing.length ? ` ${missing.join(" and ")} stay at -1: no path from ${start} reaches them.` : " The highlighted edges form a shortest-path tree.";
    t.step("done", `The queue is empty. Every reachable node has its fewest-edges distance from ${start}.${tail}`, {
      views: [...views(null), note(`dist = [${dist.join(", ")}]`, "found")],
      vars: { head },
    });
  },
});

export const multiSourceBfs = defineTrace({
  id: "multi-source-bfs",
  title: "Multi-source BFS: distance to the nearest exit",
  description: "Every exit is put in the queue at distance 0 before the search starts, so one BFS gives each open cell its distance to the nearest exit; walls and walled-off cells stay unreached.",
  code: `
function nearestExit(grid) {
  const rows = grid.length, cols = grid[0].length;
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  const queue = [];                                     //@init
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === "E") { dist[r][c] = 0; queue.push([r, c]); } //@seed
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < queue.length; head++) {
    const [r, c] = queue[head];                         //@pop
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (grid[nr]?.[nc] !== "." || dist[nr][nc] !== -1) continue;
      dist[nr][nc] = dist[r][c] + 1;                    //@push
      queue.push([nr, nc]);
    }
  }
  return dist;                                          //@done
}`,
  presets: [
    { label: "Two exits", input: { rows: ["E..#.", ".#...", ".#.#E", "....."] } },
    { label: "A walled-off corner", input: { rows: ["E..#.", ".#.#.", "..E#."] } },
  ],
  fields: { rows: { kind: "lines", chars: "E.#", maxItems: 6, maxLength: 8, help: "One row per line: E = exit, . = open, # = wall (up to 6 rows of 8)." } },
  validate: ({ rows }) => gridProblem(rows) ?? (!rows.some((r) => r.includes("E")) && "Add at least one exit (E)."),
  run(t, { rows }) {
    const R = rows.length;
    const C = rows[0].length;
    const dist: number[][] = Array.from({ length: R }, () => new Array(C).fill(-1));
    const q: [number, number][] = [];
    let head = 0;
    const shown = () => rows.map((row, r) => [...row].map((ch, c) => (ch === "#" ? "#" : dist[r][c] === -1 ? "·" : dist[r][c])));
    const views = (cur: [number, number] | null, fresh: [number, number][] = []) => {
      const tones: [number, number, Tone][] = [];
      const waiting = new Set(q.slice(head).map(([r, c]) => `${r},${c}`));
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (rows[r][c] === "#") tones.push([r, c, "muted"]);
          else if (dist[r][c] === -1) continue;
          else if (!waiting.has(`${r},${c}`)) tones.push([r, c, "done"]);
          else if (rows[r][c] === "E") tones.push([r, c, "pivot"]);
        }
      }
      for (const [r, c] of fresh) tones.push([r, c, "new"]);
      if (cur) tones.push([cur[0], cur[1], "active"]);
      return [grid("dist", shown(), { tones, rowLabels: axis(R), colLabels: axis(C) }), queue("queue", q.slice(head).map(([r, c]) => cell(r, c)))];
    };

    t.step("init", "Exits are \"E\", walls are \"#\". Every open cell starts unreached (·). We want each cell's distance to its nearest exit.", { views: views(null), vars: { head } });
    const exits: string[] = [];
    let firstPush = true;
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        if (rows[r][c] === "E") {
          dist[r][c] = 0;
          q.push([r, c]);
          exits.push(cell(r, c));
        }
      }
    }
    t.step("seed", `Put every exit, ${exits.join(" and ")}, in the queue at distance 0 before searching. They spread at the same time, as if one imaginary source were joined to all of them.`, {
      views: views(null),
      vars: { head, sources: exits.length },
    });
    while (head < q.length) {
      const [r, c] = q[head];
      head++;
      const fresh: [number, number][] = [];
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (rows[nr]?.[nc] !== "." || dist[nr][nc] !== -1) continue;
        dist[nr][nc] = dist[r][c] + 1;
        q.push([nr, nc]);
        fresh.push([nr, nc]);
      }
      if (fresh.length) {
        const list = fresh.map(([a, b]) => cell(a, b)).join(" and ");
        const text = fresh.length === 1 ? `Pop ${cell(r, c)} at distance ${dist[r][c]}. Its unreached neighbour ${list} gets distance ${dist[r][c] + 1}.` : `Pop ${cell(r, c)} at distance ${dist[r][c]}. Its unreached neighbours ${list} get distance ${dist[r][c] + 1}.`;
        const why = firstPush ? " This is the first time any exit reaches them, so it is their distance to the nearest exit." : "";
        firstPush = false;
        t.step("push", text + why, {
          views: views([r, c], fresh),
          vars: { head, d: dist[r][c] },
        });
      } else {
        t.step("pop", `Pop ${cell(r, c)} at distance ${dist[r][c]}. Its neighbours are walls, the edge, or already have a distance from a nearer or equally near exit: nothing to add.`, {
          views: views([r, c]),
          vars: { head, d: dist[r][c] },
        });
      }
    }
    let unreached = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (rows[r][c] === "." && dist[r][c] === -1) unreached++;
    const tail = unreached ? ` ${unreached} open cell${unreached === 1 ? "" : "s"} stay at · (-1): walls cut them off from every exit.` : " Every open cell was reached.";
    t.step("done", `The queue is empty after one pass over the grid, however many exits there are.${tail}`, {
      views: [...views(null), note(unreached ? `${unreached} cells unreachable` : "All cells reached", unreached ? "bad" : "found")],
      vars: { head },
    });
  },
});
