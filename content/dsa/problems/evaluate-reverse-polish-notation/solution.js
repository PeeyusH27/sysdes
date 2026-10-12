function evalRPN(tokens) {
  const stack = []; // values waiting for an operator
  for (const tok of tokens) {
    if (tok === "+" || tok === "-" || tok === "*" || tok === "/") {
      const b = stack.pop(); // pushed last, so it is the right operand
      const a = stack.pop();
      if (tok === "+") stack.push(a + b);
      else if (tok === "-") stack.push(a - b);
      else if (tok === "*") stack.push(a * b);
      else stack.push(Math.trunc(a / b)); // toward zero, unlike Math.floor
    } else {
      stack.push(Number(tok));
    }
  }
  return stack.pop();
}
