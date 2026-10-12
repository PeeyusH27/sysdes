function generateParenthesis(n) {
  const result = [];
  const path = [];

  function backtrack(open, close) {
    if (path.length === 2 * n) {
      result.push(path.join(""));
      return;
    }
    if (open < n) {             // an opening bracket is allowed while some are left
      path.push("(");
      backtrack(open + 1, close);
      path.pop();
    }
    if (close < open) {         // a closing bracket needs an unmatched "(" before it
      path.push(")");
      backtrack(open, close + 1);
      path.pop();
    }
  }

  backtrack(0, 0);
  return result;
}
