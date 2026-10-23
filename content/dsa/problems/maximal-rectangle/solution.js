function maximalRectangle(matrix) {
  const cols = matrix[0].length;
  const heights = new Array(cols).fill(0); // heights[j] = consecutive 1s ending at the current row in column j
  let best = 0;
  for (const row of matrix) {
    for (let j = 0; j < cols; j++) heights[j] = row[j] === 1 ? heights[j] + 1 : 0;
    best = Math.max(best, largestInHistogram(heights));
  }
  return best;
}

// Largest rectangle under a histogram, with a stack of indices whose heights increase.
function largestInHistogram(heights) {
  const stack = [];
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i]; // a final 0 flushes the stack
    while (stack.length && heights[stack[stack.length - 1]] >= h) {
      const height = heights[stack.pop()];
      const left = stack.length ? stack[stack.length - 1] : -1;
      best = Math.max(best, height * (i - left - 1));
    }
    stack.push(i);
  }
  return best;
}
