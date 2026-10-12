function largestRectangleArea(heights) {
  const stack = []; // indices whose heights increase from bottom to top
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i]; // a final bar of height 0 resolves everything left
    while (stack.length && heights[stack[stack.length - 1]] >= h) {
      const top = stack.pop();
      // Bar `top` can't extend right past i - 1, nor left past the shorter bar now on top of the stack.
      const left = stack.length ? stack[stack.length - 1] : -1;
      best = Math.max(best, heights[top] * (i - left - 1));
    }
    stack.push(i);
  }
  return best;
}
