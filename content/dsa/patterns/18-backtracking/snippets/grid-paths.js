// Template 4: backtracking on a grid. Counts the paths from the top-left to the bottom-right cell that
// step only on open cells (0), move up/down/left/right, and never visit a cell twice.
// The grid itself is the visited set: mark a cell before exploring from it, restore it afterwards.
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function countPaths(grid) {
  const rows = grid.length;
  const cols = grid[0].length;

  function explore(r, c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== 0) return 0; // off the board, wall or on the path
    if (r === rows - 1 && c === cols - 1) return 1;
    grid[r][c] = 2;                              // choose: this cell is on the current path
    let total = 0;
    for (const [dr, dc] of DIRS) total += explore(r + dr, c + dc); // explore
    grid[r][c] = 0;                              // un-choose: free the cell for other paths
    return total;
  }

  return explore(0, 0);
}
