import { arr, circleLayout, defineTrace, graph, note } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

type Edge = [number, number];

export const unionByRank = defineTrace({
  id: "union-by-rank",
  title: "Union by rank: merging groups as edges arrive",
  description:
    "Edges are added one at a time. find returns each endpoint's root, union hangs the shorter tree under the taller one and lowers the group count, and an edge whose ends already share a root is rejected because it would close a cycle.",
  code: `
function countComponents(n, edges) {
  const parent = [...Array(n).keys()];               //@init
  const rank = new Array(n).fill(0);
  let count = n;
  const find = (x) => {
    if (parent[x] !== x) parent[x] = find(parent[x]); //@compress
    return parent[x];
  };
  for (const [a, b] of edges) {
    let ra = find(a), rb = find(b);                  //@find
    if (ra === rb) continue;                         //@same
    if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;                                 //@link
    if (rank[ra] === rank[rb]) rank[ra]++;           //@rank
    count--;
  }
  return count;                                      //@done
}`,
  presets: [
    { label: "Two groups and a cycle", input: { n: 7, edges: [[0, 1], [2, 3], [1, 3], [4, 5], [3, 0], [5, 6]] as Edge[] } },
    { label: "An isolated node", input: { n: 5, edges: [[3, 4], [0, 1], [4, 0]] as Edge[] } },
  ],
  run(t, { n, edges }) {
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array<number>(n).fill(0);
    let count = n;
    const layout = circleLayout(parent);
    const nodes = parent.map((i) => ({ id: i, x: layout[i].x, y: layout[i].y }));
    const edgeTone = new Map<number, Tone>();
    let current = -1;
    /** Read-only root lookup for the badges (the real find below compresses). */
    const rootOf = (x: number) => {
      while (parent[x] !== x) x = parent[x];
      return x;
    };
    const views = (nodeTones: [number, Tone][] = [], cellTones: Record<number, Tone> = {}) => {
      const edgeTones: [number, number, Tone][] = [];
      edges.forEach(([a, b], i) => {
        const tone = i === current ? "active" : edgeTone.get(i);
        if (tone) edgeTones.push([a, b, tone]);
      });
      const rootTones: Record<number, Tone> = {};
      parent.forEach((p, i) => p === i && (rootTones[i] = "pivot"));
      return [
        graph("graph (badge = root)", { nodes, edges: edges.map(([a, b]) => ({ from: a, to: b })) }, { tones: nodeTones, edgeTones, badges: parent.map((_, i) => [i, `r=${rootOf(i)}`]) }),
        arr("parent", parent, { tones: { ...rootTones, ...cellTones } }),
        arr("rank", rank),
      ];
    };
    const find = (x: number) => {
      const path: number[] = [];
      let root = x;
      while (parent[root] !== root) {
        path.push(root);
        root = parent[root];
      }
      const moved = path.filter((p) => parent[p] !== root);
      if (moved.length) {
        moved.forEach((p) => (parent[p] = root));
        const cells: Record<number, Tone> = {};
        moved.forEach((p) => (cells[p] = "new"));
        t.step(
          "compress",
          `find(${x}) walks ${[...path, root].join(" → ")} to the root ${root}. On the way back, path compression points ${moved.join(" and ")} straight at ${root}, so the next find from there is one hop.`,
          { views: views([[x, "active"], [root, "pivot"]], cells), vars: { count } },
        );
      }
      return root;
    };

    t.step("init", `Every node starts as its own root (parent[i] = i), so there are ${n} groups. The badge under each node names its current root; roots are highlighted in parent.`, {
      views: views(),
      vars: { count },
    });
    edges.forEach(([a, b], i) => {
      current = i;
      let ra = find(a);
      let rb = find(b);
      t.step("find", `Edge ${a}-${b}: find(${a}) = ${ra} and find(${b}) = ${rb}.`, {
        views: views([[a, "active"], [b, "active"], [ra, "pivot"], [rb, "pivot"]]),
        vars: { edge: `${a}-${b}`, ra, rb, count },
      });
      if (ra === rb) {
        edgeTone.set(i, "bad");
        current = -1;
        t.step("same", `Both ends already have root ${ra}: ${a} and ${b} are connected without this edge, so adding it would close a cycle. Skip it; count stays ${count}.`, {
          views: views([[a, "bad"], [b, "bad"]]),
          vars: { edge: `${a}-${b}`, ra, rb, count },
        });
        return;
      }
      if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
      const tie = rank[ra] === rank[rb];
      parent[rb] = ra;
      edgeTone.set(i, "done");
      if (!tie) count--;
      t.step(
        "link",
        tie
          ? `Different roots, both rank ${rank[ra]}. Hang ${rb} under ${ra}: parent[${rb}] = ${ra}. Every node whose root was ${rb} now reaches ${ra}.`
          : `Different roots. ${ra}'s tree is taller (rank ${rank[ra]} vs ${rank[rb]}), so ${rb} goes under it and the height doesn't grow: parent[${rb}] = ${ra}. count drops to ${count}.`,
        { views: views([[rb, "new"], [ra, "pivot"]], { [rb]: "new" }), vars: { edge: `${a}-${b}`, ra, rb, count } },
      );
      if (tie) {
        rank[ra]++;
        count--;
        current = -1;
        t.step("rank", `The two trees were equally tall, so the merged one is one level taller: rank[${ra}] = ${rank[ra]}. Two groups became one, so count drops to ${count}.`, {
          views: views([[ra, "pivot"]]),
          vars: { edge: `${a}-${b}`, ra, rb, count },
        });
      }
    });
    current = -1;
    const groups = new Map<number, number[]>();
    parent.forEach((_, i) => {
      const r = rootOf(i);
      groups.set(r, [...(groups.get(r) ?? []), i]);
    });
    const listed = [...groups.values()].map((g) => `{${g.join(", ")}}`).join(" and ");
    t.step("done", `All edges are processed. count = ${count}: the groups are ${listed}. A node that never appears in an edge still counts, because count started at n.`, {
      views: [...views(), note(`Answer: ${count} components`, "found")],
      vars: { count },
    });
  },
});

export const pathCompression = defineTrace({
  id: "path-compression",
  title: "find with path compression",
  description:
    "find climbs parent pointers from a node to its root, then walks the same path a second time and points every node on it directly at the root, so later finds from those nodes take a single hop.",
  code: `
function find(parent, x) {
  let root = x;                     //@start
  while (parent[root] !== root) {   //@climb
    root = parent[root];
  }
  while (parent[x] !== root) {      //@walk
    const next = parent[x];
    parent[x] = root;               //@repoint
    x = next;
  }
  return root;                      //@done
}`,
  presets: [
    {
      label: "A chain of five",
      input: { parent: [1, 2, 3, 4, 4], queries: [0, 1], pos: [[60, 92], [28, 86], [12, 56], [22, 26], [50, 6]] as [number, number][] },
    },
    {
      label: "Two finds share a path",
      input: { parent: [0, 0, 1, 2, 2, 0, 5], queries: [3, 4], pos: [[50, 6], [28, 30], [38, 60], [14, 90], [50, 90], [74, 30], [86, 60]] as [number, number][] },
    },
  ],
  run(t, { parent, queries, pos }) {
    const nodes = parent.map((_, i) => ({ id: i, x: pos[i][0], y: pos[i][1] }));
    const views = (o: { x?: number; root?: number; path?: number[]; fresh?: number }, extra: ReturnType<typeof note>[] = []) => {
      const tones: [number, Tone][] = (o.path ?? []).map((p) => [p, "compare"]);
      if (o.root !== undefined) tones.push([o.root, "pivot"]);
      if (o.x !== undefined) tones.push([o.x, "active"]);
      const edges = parent.flatMap((p, i) => (p === i ? [] : [{ from: i, to: p }]));
      const edgeTones: [number, number, Tone][] = o.fresh === undefined ? [] : [[o.fresh, parent[o.fresh], "new"]];
      const pointers: Record<string, number> = {};
      if (o.x !== undefined) pointers.x = o.x;
      if (o.root !== undefined) pointers.root = o.root;
      const cells: Record<number, Tone> = {};
      if (o.root !== undefined) cells[o.root] = "pivot";
      if (o.fresh !== undefined) cells[o.fresh] = "new";
      return [graph("parent pointers", { nodes, edges, directed: true }, { tones, edgeTones }), arr("parent", parent, { pointers, tones: cells }), ...extra];
    };

    const repointed = new Set<number>();
    queries.forEach((x, q) => {
      let root = x;
      const path: number[] = [];
      t.step(
        "start",
        q === 0
          ? `find(${x}): each arrow is a parent pointer. Start at ${x} and climb until a node points at itself; that node is the root.`
          : repointed.has(x)
            ? `Now find(${x}). The previous find already re-pointed ${x} at the root, so this climb is a single hop.`
            : `Now find(${x}). ${x} still points at ${parent[x]}, but the previous find moved ${parent[x]} right next to the root, so this climb is shorter.`,
        { views: views({ x, root }), vars: { x, root } },
      );
      while (parent[root] !== root) {
        path.push(root);
        const from = root;
        root = parent[root];
        t.step("climb", `parent[${from}] = ${root}, so climb to ${root}.${parent[root] === root ? ` parent[${root}] = ${root}: ${root} is the root, after ${path.length} hop${path.length > 1 ? "s" : ""}.` : ""}`, {
          views: views({ x, root, path }),
          vars: { x, root, hops: path.length },
        });
      }
      let cur = x;
      while (parent[cur] !== root) {
        const next = parent[cur];
        parent[cur] = root;
        repointed.add(cur);
        t.step("repoint", `${cur} pointed at ${next}. Point it straight at the root instead: parent[${cur}] = ${root}. Then continue from ${next}.`, {
          views: views({ x: cur, root, path: path.filter((p) => p !== cur), fresh: cur }),
          vars: { x: cur, root, hops: path.length },
        });
        cur = next;
      }
      const last = q === queries.length - 1;
      const caption =
        path.length > 1
          ? `Every node on the path now points directly at ${root}. This find took ${path.length} hops; the next find from any of those nodes takes one. Return ${root}.`
          : `${x} already pointed at the root: one hop, nothing to shorten. Return ${root}.`;
      t.step("done", caption, {
        views: views({ x, root }, last ? [note(`Paths are flat: find is one hop for ${parent.filter((p, i) => p === root && i !== root).length} nodes`, "found")] : []),
        vars: { x, root, hops: path.length },
      });
    });
  },
});
