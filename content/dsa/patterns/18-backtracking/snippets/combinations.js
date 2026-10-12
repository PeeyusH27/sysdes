// Template 1: choose → explore → un-choose, with a start index.
// Lists every way to pick k numbers from 1..n. Each call only picks numbers bigger than the last one,
// so every combination is built exactly once ([1, 2] is never also built as [2, 1]).
export function combinations(n, k) {
  const result = [];
  const path = [];

  function backtrack(start) {
    if (path.length === k) {
      result.push([...path]);    // record a copy: path keeps changing after this
      return;
    }
    for (let i = start; i <= n; i++) {
      path.push(i);              // choose
      backtrack(i + 1);          // explore: only numbers after i
      path.pop();                // un-choose, so the next i starts from the same path
    }
  }

  backtrack(1);
  return result;
}
