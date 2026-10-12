// Template 2: a frequency map. Count once, then answer "how many?" for any value in O(1).
export function countAll(items) {
  const count = new Map();
  for (const x of items) count.set(x, (count.get(x) ?? 0) + 1);
  return count;
}

// Counting as a budget: can `note` be written using each letter of `magazine` at most once?
export function canConstruct(note, magazine) {
  const count = countAll(magazine);
  for (const ch of note) {
    const left = count.get(ch) ?? 0;
    if (left === 0) return false;   // this letter has run out
    count.set(ch, left - 1);        // spend one copy
  }
  return true;
}
