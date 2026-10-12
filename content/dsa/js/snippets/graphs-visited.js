// Count islands of '1' three ways. All visit each cell once: O(rows × cols).
const grid = [
  ['1', '1', '0', '0'],
  ['1', '0', '0', '1'],
  ['0', '0', '1', '1'],
];
const rows = grid.length;
const cols = grid[0].length;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// 1. A Set of string keys: flexible, but builds a string per cell (slowest).
function islandsWithSet() {
  const seen = new Set();
  const flood = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1' || seen.has(`${r},${c}`)) return;
    seen.add(`${r},${c}`);
    for (const [dr, dc] of DIRS) flood(r + dr, c + dc);
  };
  let count = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === '1' && !seen.has(`${r},${c}`)) {
        count++;
        flood(r, c);
      }
  return count;
}

// 2. A flat typed array indexed by r * cols + c: compact and fast. Uses an explicit stack.
function islandsWithArray() {
  const seen = new Uint8Array(rows * cols);  // all 0 = unvisited
  let count = 0;
  for (let start = 0; start < rows * cols; start++) {
    if (grid[Math.floor(start / cols)][start % cols] !== '1' || seen[start]) continue;
    count++;
    seen[start] = 1;
    const stack = [start];
    while (stack.length) {
      const id = stack.pop();
      const r = Math.floor(id / cols);           // decode id -> (row, col)
      const c = id % cols;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        const next = nr * cols + nc;             // encode (row, col) -> id
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] !== '1' || seen[next]) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }
  }
  return count;
}

// 3. Mark the grid itself: no extra memory, but it destroys the input (work on a copy if needed).
function islandsByMarking(g) {
  const sink = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || g[r][c] !== '1') return;
    g[r][c] = '0';
    for (const [dr, dc] of DIRS) sink(r + dr, c + dc);
  };
  let count = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (g[r][c] === '1') {
        count++;
        sink(r, c);
      }
  return count;
}
const copy = grid.map((row) => [...row]);
console.log(islandsWithSet(), islandsWithArray(), islandsByMarking(copy)); // 2 2 2
console.log(grid[0].join(''), copy[0].join(''));                           // 1100 0000
