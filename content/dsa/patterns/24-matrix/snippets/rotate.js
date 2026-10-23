// Template 1: rotate by combining two simple moves. Transpose swaps (i, j) with (j, i); reversing every row
// then mirrors left to right. Transpose + reverse rows = 90 degrees clockwise, in place, O(1) extra space.
export function transpose(m) {
  // A new grid, so it also works for rectangles: rows x cols becomes cols x rows.
  const out = Array.from({ length: m[0].length }, () => new Array(m.length)); // never fill() with one shared row
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m[0].length; j++) out[j][i] = m[i][j];
  return out;
}

export function rotateClockwise(m) {
  const n = m.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) [m[i][j], m[j][i]] = [m[j][i], m[i][j]]; // j > i: swap each pair once
  }
  for (const row of m) row.reverse();
}

export function rotateCounterClockwise(m) {
  for (const row of m) row.reverse(); // reverse first, then transpose, for the other direction
  const n = m.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
  }
}
