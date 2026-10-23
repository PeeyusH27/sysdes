// waitFor maps each blocked thread to the thread holding the lock it wants.
// A cycle in that graph is a deadlock. Databases run this check and abort one victim.
export function findCycle(waitFor) {
  for (const start of Object.keys(waitFor)) {
    const path = [];
    let at = start;
    while (at !== undefined && !path.includes(at)) {
      path.push(at);
      at = waitFor[at];
    }
    if (at !== undefined) return path.slice(path.indexOf(at));
  }
  return null;
}

// Prevention: break "circular wait" by taking locks in one global order, here by account id.
// transfer(3, 7) and transfer(7, 3) now both lock account 3 first, so they cannot wait in a circle.
export const inLockOrder = (a, b) => (a < b ? [a, b] : [b, a]);
