function canFinish(numCourses, prerequisites) {
  const unlocks = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [course, pre] of prerequisites) {
    unlocks[pre].push(course); // edge pre → course
    indegree[course]++;
  }

  const queue = [];
  for (let c = 0; c < numCourses; c++) if (indegree[c] === 0) queue.push(c);
  let taken = 0;
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    taken++;
    for (const next of unlocks[c]) {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next); // its last prerequisite is done
    }
  }
  return taken === numCourses; // anything left over is on, or behind, a cycle
}
