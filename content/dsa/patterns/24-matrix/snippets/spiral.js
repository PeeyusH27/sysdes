// Template 2: layers and boundaries. Four walls frame the unread rectangle; after each side is read,
// that wall moves inward. The two guards stop a leftover single row or column being read twice.
export function spiralOrder(m) {
  const out = [];
  let top = 0;
  let bottom = m.length - 1;
  let left = 0;
  let right = m[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(m[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push(m[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(m[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(m[r][left]);
      left++;
    }
  }
  return out;
}

// The same spiral written the other way round: a direction array and "turn when blocked", to fill 1..n*n.
export function spiralFill(n) {
  const grid = Array.from({ length: n }, () => new Array(n).fill(0));
  const dr = [0, 1, 0, -1]; // right, down, left, up
  const dc = [1, 0, -1, 0];
  let r = 0;
  let c = 0;
  let d = 0;
  for (let k = 1; k <= n * n; k++) {
    grid[r][c] = k;
    const nr = r + dr[d];
    const nc = c + dc[d];
    if (nr < 0 || nr >= n || nc < 0 || nc >= n || grid[nr][nc] !== 0) d = (d + 1) % 4; // blocked: turn right
    r += dr[d];
    c += dc[d];
  }
  return grid;
}
