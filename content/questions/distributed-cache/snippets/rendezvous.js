// Rendezvous (highest random weight) hashing: how a client library picks the cache node for a key, with no ring to store.
// For each key, score every node with hash(node + key) and take the highest. Remove a node and only its keys move
// (each goes to its second-best node); add a node and it takes about 1/(N+1) of the keys, from everyone equally.

function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Nodes ranked for a key, best first. [0] is the primary; [1] is who takes over if it dies.
export function rank(nodes, key) {
  return nodes
    .map((n) => ({ n, score: hash32(`${n}|${key}`) }))
    .sort((a, b) => b.score - a.score || (a.n < b.n ? -1 : 1))
    .map((x) => x.n);
}

export const pick = (nodes, key) => rank(nodes, key)[0];

// Skip nodes the client believes are down; the key falls to the next best node.
export const pickAlive = (nodes, key, isDown) => rank(nodes, key).find((n) => !isDown(n));
