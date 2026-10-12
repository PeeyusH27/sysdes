function minimumSemesters(n, relations) {
  const unlocks = Array.from({ length: n + 1 }, () => []); // courses are numbered 1..n
  const indegree = new Array(n + 1).fill(0);
  for (const [before, after] of relations) {
    unlocks[before].push(after);
    indegree[after]++;
  }

  let current = [];
  for (let c = 1; c <= n; c++) if (indegree[c] === 0) current.push(c);
  let semesters = 0;
  let taken = 0;
  while (current.length > 0) {
    semesters++;             // take every course in `current` this semester
    taken += current.length;
    const upcoming = [];
    for (const c of current) {
      for (const next of unlocks[c]) {
        indegree[next]--;
        if (indegree[next] === 0) upcoming.push(next); // ready from next semester on
      }
    }
    current = upcoming;
  }
  return taken === n ? semesters : -1;
}
