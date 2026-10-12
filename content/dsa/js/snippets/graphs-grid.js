// A grid is a graph: each cell links to its up/down/left/right neighbours.
const grid = [
  ['.', '.', '#', '.'],
  ['#', '.', '#', '.'],
  ['.', '.', '.', '.'],
];
const rows = grid.length;
const cols = grid[0].length;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;

// Fewest steps from top-left to top-right with BFS. Visited cells are marked in a parallel grid.
function shortestPath(sr, sc, tr, tc) {
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1)); // -1 = unvisited
  dist[sr][sc] = 0;
  const queue = [[sr, sc]];
  for (let head = 0; head < queue.length; head++) {
    const [r, c] = queue[head];
    if (r === tr && c === tc) return dist[r][c];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc) || grid[nr][nc] === '#' || dist[nr][nc] !== -1) continue; // bounds first!
      dist[nr][nc] = dist[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return -1;
}
console.log(shortestPath(0, 0, 0, 3));   // 7: down around both walls and back up

// Eight directions add the diagonals.
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const open8 = DIRS8.filter(([dr, dc]) => inBounds(1 + dr, 1 + dc) && grid[1 + dr][1 + dc] === '.');
console.log(open8.length);               // 5 open cells around (1, 1)
