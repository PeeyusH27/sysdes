// Little's law: items in the system L = arrival rate λ × time each one spends there W
export const inFlight = (perSec, seconds) => perSec * seconds;

// When producers outpace consumers, the backlog grows by the difference every second
export const backlogAfter = (arrivePerSec, servePerSec, seconds) =>
  Math.max(0, (arrivePerSec - servePerSec) * seconds);

// A new message waits for everything ahead of it to be processed (Little's law again: W = L / λ)
export const waitSeconds = (backlog, servePerSec) => backlog / servePerSec;

// Workers needed to keep up, leaving headroom so a small spike doesn't start a backlog
export const workersNeeded = (perSec, msPerJob, targetUtilisation = 0.7) =>
  Math.ceil((perSec * msPerJob) / 1_000 / targetUtilisation);

// Time to drain a backlog: only the spare capacity (serve − arrive) eats into it
export const drainSeconds = (backlog, arrivePerSec, servePerSec) =>
  servePerSec > arrivePerSec ? backlog / (servePerSec - arrivePerSec) : Infinity;

// backlogAfter(1000, 800, 3600) → 720,000 messages after one hour
// waitSeconds(720_000, 800)     → 900 s: a new message waits 15 minutes
// inFlight(1000, 0.2)           → 200 jobs in progress at once; workersNeeded(1000, 200) → 286 at 70% busy
// drainSeconds(720_000, 1000, 1200) → 3,600 s: scaling to 1,200/s takes an hour to catch up
