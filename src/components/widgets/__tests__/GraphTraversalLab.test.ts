import { test, expect } from "vitest";
import { COLS, GOAL, ROWS, START, edit, id, initSearch, neighbours, pathTo, pending, randomMaze, shortest, stepSearch, type Algo, type Maze, type Search } from "../GraphTraversalLab";

const N = ROWS * COLS;
const openMaze = (start = START, goal = GOAL): Maze => ({ walls: new Array<boolean>(N).fill(false), start, goal });
function runAll(maze: Maze, algo: Algo, onStep?: (s: Search) => void) {
  let s = initSearch(maze, algo);
  for (let guard = 0; !s.done; guard++) {
    expect(guard).toBeLessThanOrEqual(N + 1);
    s = stepSearch(maze, s);
    onStep?.(s);
  }
  return s;
}
/** Is `path` a walk of open, adjacent cells from start to goal? */
const validPath = (maze: Maze, path: number[]) =>
  path[0] === maze.start && path.at(-1) === maze.goal && path.every((c, i) => !maze.walls[c] && (i === 0 || neighbours(path[i - 1]).includes(c)));

test("BFS on an open grid: distance is the Manhattan distance, and the path is shortest", () => {
  const maze = openMaze(id(0, 0), id(ROWS - 1, COLS - 1));
  const s = runAll(maze, "bfs");
  expect(s.found).toBe(true);
  const path = pathTo(s, maze.goal);
  expect(path.length - 1).toBe(ROWS - 1 + COLS - 1);
  expect(validPath(maze, path)).toBe(true);
});

test("BFS takes cells out in order of distance and the queue never spans more than two distances", () => {
  const maze = randomMaze(3);
  runAll(maze, "bfs", (s) => {
    const d = s.order.map((c) => s.dist[c]);
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThanOrEqual(d[i - 1]);
    const q = pending(s).map((c) => s.dist[c]);
    if (q.length) expect(Math.max(...q) - Math.min(...q)).toBeLessThanOrEqual(1);
  });
});

test("BFS distances equal the brute-force shortest distances on many random mazes", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const maze = randomMaze(seed);
    const s = runAll(maze, "bfs");
    const ref = shortest(maze);
    expect(s.found).toBe(true);
    expect(s.dist[maze.goal]).toBe(ref[maze.goal]);
    for (const c of s.order) expect(s.dist[c]).toBe(ref[c]);
    expect(validPath(maze, pathTo(s, maze.goal))).toBe(true);
  }
});

test("DFS finds a valid path that is never shorter than BFS's, and is often longer", () => {
  let longer = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const maze = randomMaze(seed);
    const s = runAll(maze, "dfs");
    expect(s.found).toBe(true);
    const path = pathTo(s, maze.goal);
    expect(validPath(maze, path)).toBe(true);
    const best = shortest(maze)[maze.goal];
    expect(path.length - 1).toBeGreaterThanOrEqual(best);
    if (path.length - 1 > best) longer++;
  }
  expect(longer).toBeGreaterThan(5);
});

test("mark on push: no cell is ever pushed twice, and each cell is visited at most once", () => {
  for (const algo of ["bfs", "dfs"] as Algo[]) {
    const maze = openMaze(id(3, 5), id(ROWS - 1, 0));
    const s = runAll(maze, algo);
    expect(new Set(s.frontier).size).toBe(s.frontier.length);
    expect(new Set(s.order).size).toBe(s.order.length);
    // every in-bounds neighbour check of every visited cell is counted, nothing more
    const expected = s.order.slice(0, -1).reduce((n, c) => n + neighbours(c).length, 0);
    expect(s.checks).toBe(expected);
  }
});

test("a walled-off goal: the search runs dry, visits only the reachable cells, and reports no path", () => {
  const maze = openMaze(id(0, 0), id(ROWS - 1, COLS - 1));
  const walls = maze.walls.slice();
  for (let r = 0; r < ROWS; r++) walls[id(r, 5)] = true; // a full wall down column 5
  const cut = { ...maze, walls };
  for (const algo of ["bfs", "dfs"] as Algo[]) {
    const s = runAll(cut, algo);
    expect(s.found).toBe(false);
    expect(pathTo(s, cut.goal)).toEqual([]);
    expect(s.order.length).toBe(ROWS * 5); // columns 0..4
  }
});

test("start equals goal, and stepping a finished search changes nothing", () => {
  const maze = openMaze(id(2, 2), id(2, 2));
  const s = stepSearch(maze, initSearch(maze, "bfs"));
  expect(s.found && s.done).toBe(true);
  expect(pathTo(s, maze.goal)).toEqual([id(2, 2)]);
  expect(stepSearch(maze, s)).toBe(s);
});

test("random mazes are deterministic, keep the start and goal open, and are solvable", () => {
  expect(randomMaze(7)).toEqual(randomMaze(7));
  for (let seed = 1; seed <= 30; seed++) {
    const m = randomMaze(seed);
    expect(m.walls[m.start] || m.walls[m.goal]).toBe(false);
    expect(shortest(m)[m.goal]).toBeGreaterThan(0);
  }
});

test("editing: walls toggle and paint, start and goal can't be walled, and moving them clears a wall", () => {
  const maze = openMaze();
  const c = id(4, 4);
  const walled = edit(maze, c, "wall");
  expect(walled.walls[c]).toBe(true);
  expect(edit(walled, c, "wall").walls[c]).toBe(false);
  expect(edit(walled, c, "wall", true).walls[c]).toBe(true);
  expect(edit(maze, maze.start, "wall")).toBe(maze);
  const moved = edit(walled, c, "start");
  expect(moved.start).toBe(c);
  expect(moved.walls[c]).toBe(false);
  expect(edit(maze, maze.goal, "start")).toBe(maze);
});
