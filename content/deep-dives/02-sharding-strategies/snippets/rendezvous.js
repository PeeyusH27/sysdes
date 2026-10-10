import { createHash } from 'node:crypto';
const hash = s => createHash('md5').update(s).digest().readUInt32BE(0);

// Rendezvous (highest random weight) hashing: each key picks the node with the largest hash(node + key).
// No ring to maintain, and removing a node only moves that node's keys.
export const rendezvous = (key, nodes) => nodes.reduce((best, n) => (hash(n + key) > hash(best + key) ? n : best));
