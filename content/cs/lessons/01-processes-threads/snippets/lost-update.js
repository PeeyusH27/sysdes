// Two "threads" each run counter++, which the CPU does as LOAD, ADD, STORE.
// The schedule says who moves next, so we can replay any interleaving.
export function run(schedule, { locked = false } = {}) {
  const mem = { counter: 0 };
  const t = [{ pc: 0, reg: 0 }, { pc: 0, reg: 0 }];
  const ops = [(th) => { th.reg = mem.counter; }, (th) => { th.reg += 1; }, (th) => { mem.counter = th.reg; }];
  let owner = null;

  const step = (id) => {
    const th = t[id];
    if (th.pc === 3) return false;
    if (locked && th.pc === 0) {
      if (owner !== null && owner !== id) return false; // the lock is held: wait
      owner = id;
    }
    ops[th.pc](th);
    th.pc += 1;
    if (locked && th.pc === 3) owner = null; // unlock after STORE
    return true;
  };

  for (const id of schedule) step(id);
  while (t.some((th) => th.pc < 3)) if (!step(0) && !step(1)) throw new Error("stuck");
  return mem.counter;
}
