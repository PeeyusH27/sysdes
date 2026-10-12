function alienOrder(words) {
  const after = new Map();    // letter → Set of letters that must come after it
  const indegree = new Map(); // letter → number of letters that must come before it
  for (const word of words) {
    for (const ch of word) {
      if (!after.has(ch)) {
        after.set(ch, new Set());
        indegree.set(ch, 0);
      }
    }
  }

  // Only the first difference between neighbouring words tells us anything.
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    const len = Math.min(a.length, b.length);
    let j = 0;
    while (j < len && a[j] === b[j]) j++;
    if (j === len) {
      if (a.length > b.length) return ""; // "abc" before "ab" is impossible in any alphabet
      continue;
    }
    if (!after.get(a[j]).has(b[j])) {    // add each edge once, or the in-degree is off
      after.get(a[j]).add(b[j]);
      indegree.set(b[j], indegree.get(b[j]) + 1);
    }
  }

  const queue = [];
  for (const [ch, d] of indegree) if (d === 0) queue.push(ch);
  for (let head = 0; head < queue.length; head++) {
    for (const next of after.get(queue[head])) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return queue.length === after.size ? queue.join("") : ""; // letters left over sit on a cycle
}
