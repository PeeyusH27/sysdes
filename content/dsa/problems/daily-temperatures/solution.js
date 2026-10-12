function dailyTemperatures(temperatures) {
  const answer = new Array(temperatures.length).fill(0);
  const stack = []; // days still waiting for a warmer day; their temperatures never rise from bottom to top
  for (let i = 0; i < temperatures.length; i++) {
    while (stack.length && temperatures[stack[stack.length - 1]] < temperatures[i]) {
      const j = stack.pop();
      answer[j] = i - j; // day i is the first warmer day after day j
    }
    stack.push(i);
  }
  return answer;
}
