// Order of execution on a single-threaded event loop: the current code finishes first,
// then queued promise callbacks (microtasks), then the next timer or I/O callback.
export function order() {
  return new Promise((done) => {
    const log = [];
    setTimeout(() => {
      log.push('timer');
      done(log);
    }, 0);
    Promise.resolve().then(() => log.push('promise'));
    queueMicrotask(() => log.push('microtask'));
    log.push('sync');
  });
}

// Busy-waiting on the one thread stops everything else, including a timer due in 0 ms.
export function blockLoop(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end);
}
