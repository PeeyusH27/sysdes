// Plain recursion recomputes the same subproblems again and again.
let calls = 0;
function fib(n) {
  calls++;
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}
console.log(fib(25), 'calls:', calls);   // 75025 calls: 242785

// Memo in a Map: each n is computed once.
calls = 0;
function fibMemo(n, memo = new Map()) {
  calls++;
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}
console.log(fibMemo(25), 'calls:', calls); // 75025 calls: 49

// Two-dimensional state: an array of arrays (or a Map with key `${r},${c}`).
function gridPaths(rows, cols) {
  const memo = Array.from({ length: rows }, () => new Array(cols).fill(-1)); // -1 = not computed
  function paths(r, c) {
    if (r === rows - 1 || c === cols - 1) return 1;
    if (memo[r][c] !== -1) return memo[r][c];
    return (memo[r][c] = paths(r + 1, c) + paths(r, c + 1));
  }
  return paths(0, 0);
}
console.log(gridPaths(3, 7), gridPaths(16, 16)); // 28 155117520
