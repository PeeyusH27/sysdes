function pacificAtlantic(heights) {
  const rows = heights.length;
  const cols = heights[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // Walk backwards from the ocean: water in a neighbour can flow into (r, c) if the neighbour is at least as high.
  function canReach(starts) {
    const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
    const stack = [];
    for (const [r, c] of starts) {
      if (seen[r][c]) continue;
      seen[r][c] = true;
      stack.push([r, c]);
    }
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) continue;
        if (heights[nr][nc] < heights[r][c]) continue; // water can't climb from the lower neighbour
        seen[nr][nc] = true;
        stack.push([nr, nc]);
      }
    }
    return seen;
  }

  const pacificEdge = [];
  const atlanticEdge = [];
  for (let r = 0; r < rows; r++) {
    pacificEdge.push([r, 0]);
    atlanticEdge.push([r, cols - 1]);
  }
  for (let c = 0; c < cols; c++) {
    pacificEdge.push([0, c]);
    atlanticEdge.push([rows - 1, c]);
  }
  const pacific = canReach(pacificEdge);
  const atlantic = canReach(atlanticEdge);

  const result = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pacific[r][c] && atlantic[r][c]) result.push([r, c]);
    }
  }
  return result;
}
