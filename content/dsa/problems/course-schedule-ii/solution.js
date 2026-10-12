function findOrder(numCourses, prerequisites) {
  const unlocks = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [course, pre] of prerequisites) {
    unlocks[pre].push(course); // edge pre → course
    indegree[course]++;
  }

  const queue = [];
  for (let c = 0; c < numCourses; c++) if (indegree[c] === 0) queue.push(c);
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    order.push(c);
    for (const next of unlocks[c]) {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    }
  }
  return order.length === numCourses ? order : []; // a short order means a cycle
}
