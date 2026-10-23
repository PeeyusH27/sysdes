// Three ways to join users (n rows, unique id) with orders (m rows) on user id.
// Each returns the matching rows and how many comparisons or hash operations it used.
const pair = (u, o) => ({ name: u.name, total: o.total });

// Nested loop: for every user, scan every order. n x m steps (fast only when the inner side has an index).
export function nestedLoop(users, orders) {
  const rows = [];
  let steps = 0;
  for (const u of users) {
    for (const o of orders) {
      steps += 1;
      if (o.userId === u.id) rows.push(pair(u, o));
    }
  }
  return { rows, steps };
}

// Hash join: build a hash table on one side, probe it with the other. n + m steps, needs memory for the table.
export function hashJoin(users, orders) {
  const rows = [];
  const byId = new Map();
  let steps = 0;
  for (const u of users) {
    steps += 1;
    byId.set(u.id, u);
  }
  for (const o of orders) {
    steps += 1;
    const u = byId.get(o.userId);
    if (u) rows.push(pair(u, o));
  }
  return { rows, steps };
}

// Merge join: both inputs already sorted by key, so walk them together once. n + m steps, no extra memory.
export function mergeJoin(users, orders) {
  const rows = [];
  let i = 0;
  let j = 0;
  let steps = 0;
  while (i < users.length && j < orders.length) {
    steps += 1;
    if (users[i].id < orders[j].userId) i += 1;
    else if (users[i].id > orders[j].userId) j += 1;
    else {
      rows.push(pair(users[i], orders[j]));
      j += 1; // ids are unique on the user side, so only the order side advances
    }
  }
  return { rows, steps };
}
