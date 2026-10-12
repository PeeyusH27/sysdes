import { arr, defineTrace, graph, grid, note } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

type WEdge = [number, number, number];
interface GNode {
  id: number;
  label: string;
  x: number;
  y: number;
}

/** The same binary min-heap as snippets/min-heap.js, on [dist, node] pairs, so the heap view shows real heap order. */
class PairHeap {
  items: [number, number][] = [];
  push(item: [number, number]) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

const fmtDist = (d: number) => (d === Infinity ? "∞" : String(d));

export const dijkstraHeap = defineTrace({
  id: "dijkstra-heap",
  title: "Dijkstra: always settle the closest node",
  description:
    "Dijkstra pops the smallest [distance, node] pair from a min-heap, relaxes that node's edges, and pushes improved distances; entries that became outdated are skipped when they reach the top.",
  code: `
function dijkstra(adj, source) {
  const dist = new Array(adj.length).fill(Infinity);
  dist[source] = 0;                       //@init
  const heap = new MinHeap();
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop();            //@pop
    if (d > dist[u]) continue;            //@stale
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {              //@check
        dist[v] = d + w;                  //@relax
        heap.push([dist[v], v]);
      }
    }
  }
  return dist;                            //@done
}`,
  presets: [
    {
      label: "Six towns",
      input: {
        nodes: [
          { id: 0, label: "A", x: 5, y: 50 },
          { id: 1, label: "B", x: 35, y: 10 },
          { id: 2, label: "C", x: 35, y: 86 },
          { id: 3, label: "D", x: 64, y: 50 },
          { id: 4, label: "E", x: 95, y: 86 },
          { id: 5, label: "F", x: 95, y: 10 },
        ] as GNode[],
        edges: [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [2, 4, 8], [3, 4, 3], [3, 5, 6], [4, 5, 1]] as WEdge[],
        source: 0,
      },
    },
    {
      label: "Unreachable node",
      input: {
        nodes: [
          { id: 0, label: "A", x: 8, y: 50 },
          { id: 1, label: "B", x: 50, y: 10 },
          { id: 2, label: "C", x: 50, y: 90 },
          { id: 3, label: "D", x: 92, y: 50 },
        ] as GNode[],
        edges: [[0, 1, 2], [1, 2, 3], [0, 2, 6]] as WEdge[],
        source: 0,
      },
    },
  ],
  run(t, { nodes, edges, source }) {
    const n = nodes.length;
    const L = (i: number) => nodes[i].label;
    const adj: [number, number][][] = nodes.map(() => []);
    for (const [u, v, w] of edges) {
      adj[u].push([v, w]);
      adj[v].push([u, w]); // undirected roads
    }
    const dist = new Array<number>(n).fill(Infinity);
    const prev = new Array<number>(n).fill(-1);
    const settled = new Set<number>();
    const heap = new PairHeap();
    const g = { nodes, edges: edges.map(([from, to, w]) => ({ from, to, w })) };

    const views = (o: { u?: number; v?: number; edge?: [number, number, Tone]; tree?: boolean } = {}, extra: ReturnType<typeof note>[] = []) => {
      const tones: [number, Tone][] = [...settled].map((s) => [s, "done"]);
      if (o.u !== undefined) tones.push([o.u, "active"]);
      if (o.v !== undefined) tones.push([o.v, "new"]);
      const edgeTones: [number, number, Tone][] = [];
      if (o.tree) prev.forEach((p, i) => p !== -1 && edgeTones.push([p, i, "found"]));
      if (o.edge) edgeTones.push(o.edge);
      return [
        graph("graph (badge = dist)", g, { tones, edgeTones, badges: nodes.map((nd) => [nd.id, fmtDist(dist[nd.id])]) }),
        arr("heap [dist, node]", heap.items.map(([d, x]) => `${d},${L(x)}`), { tones: heap.items.length ? { 0: "pivot" } : {} }),
        ...extra,
      ];
    };

    dist[source] = 0;
    heap.push([0, source]);
    t.step("init", `Every distance starts at ∞ except the source ${L(source)}, which is 0. The heap holds one entry, [0, ${L(source)}]; the smallest entry is always at the front.`, {
      views: views({ u: source }),
      vars: { heap: heap.items.length },
    });
    while (heap.items.length > 0) {
      const [d, u] = heap.pop();
      if (d > dist[u]) {
        t.step("stale", `Pop [${d}, ${L(u)}]. It is stale: ${L(u)} was already settled at ${dist[u]}, which is smaller. This leftover was pushed before the better route was found, so skip it.`, {
          views: views({ u }),
          vars: { d, u: L(u), [`dist[${L(u)}]`]: dist[u] },
        });
        continue;
      }
      settled.add(u);
      t.step(
        "pop",
        u === source
          ? `Pop [0, ${L(u)}]: the source is settled at distance 0. Now relax each of its edges.`
          : `Pop [${d}, ${L(u)}], the smallest distance waiting. Any other route to ${L(u)} would leave through a node that is at least ${d} away and then add a non-negative edge, so ${d} is final.`,
        { views: views({ u }), vars: { d, u: L(u) } },
      );
      for (const [v, w] of adj[u]) {
        if (settled.has(v)) continue; // settled neighbours can never improve; not worth a frame
        if (d + w < dist[v]) {
          const old = dist[v];
          dist[v] = d + w;
          prev[v] = u;
          heap.push([dist[v], v]);
          t.step(
            "relax",
            old === Infinity
              ? `${L(u)}→${L(v)}: ${d} + ${w} = ${dist[v]}, better than ∞. Record it and push [${dist[v]}, ${L(v)}].`
              : `${L(u)}→${L(v)}: ${d} + ${w} = ${dist[v]} beats ${old}. Push [${dist[v]}, ${L(v)}]; the old [${old}, ${L(v)}] stays in the heap and will be skipped later.`,
            { views: views({ u, v, edge: [u, v, "active"] }), vars: { d, u: L(u), v: L(v), [`dist[${L(v)}]`]: dist[v] } },
          );
        } else {
          t.step("check", `${L(u)}→${L(v)}: ${d} + ${w} = ${d + w} doesn't beat ${dist[v]}, so nothing changes.`, {
            views: views({ u, v, edge: [u, v, "compare"] }),
            vars: { d, u: L(u), v: L(v), [`dist[${L(v)}]`]: dist[v] },
          });
        }
      }
    }
    const unreachable = nodes.filter((nd) => dist[nd.id] === Infinity).map((nd) => nd.label);
    t.step(
      "done",
      `The heap is empty. The badges are the final distances, and the highlighted edges form the shortest-path tree (how each node was reached).${unreachable.length ? ` ${unreachable.join(", ")} kept ∞: no road leads there.` : ""}`,
      {
        views: views({ tree: true }, [note(`dist = ${nodes.map((nd) => `${nd.label}:${fmtDist(dist[nd.id])}`).join("  ")}`, "found")]),
        vars: { heap: 0 },
      },
    );
  },
});

export const bellmanFordRounds = defineTrace({
  id: "bellman-ford-rounds",
  title: "Bellman-Ford: one round per extra edge",
  description:
    "Each round relaxes every directed edge once, reading last round's distances and writing into a copy, so after round r every distance is the best path with at most r edges; negative edges are handled correctly.",
  code: `
function bellmanFord(n, edges, source, rounds) {
  let dist = new Array(n).fill(Infinity);
  dist[source] = 0;                           //@init
  for (let r = 1; r <= rounds; r++) {
    const next = dist.slice();                //@copy
    for (const [u, v, w] of edges) {
      if (dist[u] + w < next[v]) {            //@check
        next[v] = dist[u] + w;                //@relax
      }
    }
    dist = next;                              //@swap
  }
  return dist;                                //@done
}`,
  presets: [
    {
      label: "A negative edge",
      input: {
        nodes: [
          { id: 0, label: "A", x: 6, y: 50 },
          { id: 1, label: "B", x: 45, y: 10 },
          { id: 2, label: "C", x: 45, y: 90 },
          { id: 3, label: "D", x: 92, y: 50 },
        ] as GNode[],
        edges: [[0, 1, 4], [0, 2, 5], [2, 1, -3], [1, 3, 2], [2, 3, 6]] as WEdge[],
        rounds: 3,
        why: "n - 1 = 3 rounds: enough for any shortest path",
        lesson: "B = 2 comes through the negative edge C→B. Dijkstra would have settled B at 4 before it ever expanded C.",
      },
    },
    {
      label: "At most 2 edges",
      input: {
        nodes: [
          { id: 0, label: "A", x: 5, y: 62 },
          { id: 1, label: "B", x: 30, y: 10 },
          { id: 2, label: "C", x: 70, y: 10 },
          { id: 3, label: "D", x: 95, y: 62 },
        ] as GNode[],
        edges: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 2, 5], [0, 3, 9]] as WEdge[],
        rounds: 2,
        why: "only 2 rounds: paths of at most 2 edges (1 stop)",
        lesson: "D = 6 is A→C→D. The cheaper A→B→C→D costs 3 but needs 3 edges, which 2 rounds never build.",
      },
    },
  ],
  run(t, { nodes, edges, rounds, why, lesson }) {
    const n = nodes.length;
    const L = (i: number) => nodes[i].label;
    const g = { nodes, edges: edges.map(([from, to, w]) => ({ from, to, w })), directed: true };
    let dist = new Array<number>(n).fill(Infinity);
    let next: number[] | null = null;
    const views = (o: { edge?: [number, number, Tone]; read?: number; write?: [number, Tone] } = {}, extra: ReturnType<typeof note>[] = []) => {
      const rows = next ? [dist, next] : [dist];
      const tones: [number, number, Tone][] = [];
      if (o.read !== undefined) tones.push([0, o.read, "compare"]);
      if (o.write && next) tones.push([1, o.write[0], o.write[1]]);
      return [
        graph("graph (badge = dist)", g, { edgeTones: o.edge ? [o.edge] : [], tones: o.read !== undefined ? [[o.read, "active"]] : [], badges: nodes.map((nd) => [nd.id, fmtDist(dist[nd.id])]) }),
        grid("distances", rows.map((row) => row.map(fmtDist)), { rowLabels: next ? ["dist (read)", "next (write)"] : ["dist"], colLabels: nodes.map((nd) => nd.label), tones }),
        ...extra,
      ];
    };

    dist[0] = 0;
    t.step("init", `Only the source A is reachable with 0 edges: dist = 0 for A and ∞ for everyone else. We will run ${rounds} rounds (${why}).`, { views: views(), vars: { round: 0 } });
    for (let r = 1; r <= rounds; r++) {
      next = dist.slice();
      t.step("copy", `Round ${r}: copy dist into next. Every edge reads from dist (paths with at most ${r - 1} edge${r - 1 === 1 ? "" : "s"}) and writes into next, so this round adds at most one edge to any path.`, {
        views: views(),
        vars: { round: r },
      });
      let changed = false;
      for (const [u, v, w] of edges) {
        const cand = dist[u] + w;
        if (cand < next[v]) {
          const old = next[v];
          next[v] = cand;
          changed = true;
          t.step("relax", `${L(u)}→${L(v)} (${w}): ${dist[u]} + ${w < 0 ? `(${w})` : w} = ${cand} beats ${fmtDist(old)}, so next[${L(v)}] = ${cand}.`, {
            views: views({ edge: [u, v, "active"], read: u, write: [v, "new"] }),
            vars: { round: r, edge: `${L(u)}→${L(v)}`, candidate: cand },
          });
        } else {
          t.step(
            "check",
            dist[u] === Infinity
              ? `${L(u)}→${L(v)} (${w}): ${L(u)} isn't reachable yet in dist (∞), so this edge can't help this round.`
              : `${L(u)}→${L(v)} (${w}): ${dist[u]} + ${w < 0 ? `(${w})` : w} = ${cand} doesn't beat next[${L(v)}] = ${fmtDist(next[v])}.`,
            { views: views({ edge: [u, v, "compare"], read: u, write: [v, "compare"] }), vars: { round: r, edge: `${L(u)}→${L(v)}`, candidate: fmtDist(cand) } },
          );
        }
      }
      dist = next;
      next = null;
      t.step("swap", changed ? `End of round ${r}: next becomes dist. These are now the best costs using at most ${r} edge${r === 1 ? "" : "s"}.` : `Round ${r} changed nothing, so more rounds can't either: the distances are final.`, {
        views: views(),
        vars: { round: r },
      });
      if (!changed) break;
    }
    t.step("done", `Return dist. ${lesson}`, {
      views: views({}, [note(`dist = ${nodes.map((nd) => `${nd.label}:${fmtDist(dist[nd.id])}`).join("  ")}`, "found")]),
      vars: { round: rounds },
    });
  },
});
