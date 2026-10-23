// Jobs arrive together at time 0; each is { name, burst } in milliseconds.
// Wait time = finish - burst; turnaround = finish.
function summarize(finish, jobs) {
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    finish,
    avgWait: avg(jobs.map((j) => finish[j.name] - j.burst)),
    avgTurnaround: avg(jobs.map((j) => finish[j.name])),
  };
}

export function fcfs(jobs) {
  const finish = {};
  let t = 0;
  for (const j of jobs) finish[j.name] = t += j.burst;
  return summarize(finish, jobs);
}

// Shortest job first: the best average wait, but it needs to know the burst and can starve long jobs.
export const sjf = (jobs) => fcfs([...jobs].sort((a, b) => a.burst - b.burst));

// Round robin: each job runs for at most `quantum`, then goes to the back of the queue.
export function roundRobin(jobs, quantum) {
  const left = Object.fromEntries(jobs.map((j) => [j.name, j.burst]));
  const queue = jobs.map((j) => j.name);
  const finish = {};
  let t = 0;
  while (queue.length) {
    const name = queue.shift();
    const ran = Math.min(quantum, left[name]);
    t += ran;
    left[name] -= ran;
    if (left[name] > 0) queue.push(name);
    else finish[name] = t;
  }
  return summarize(finish, jobs);
}
