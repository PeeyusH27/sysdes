import { UnionFind } from './union-find.js'; // @hide
import { countGroups } from './count-groups.js'; // @hide
import { firstCycleEdge } from './cycle-edge.js'; // @hide
import { KeyedUnionFind } from './keyed-union-find.js'; // @hide
// Edit the inputs and press Run. The classes and functions are the templates above.
const uf = new UnionFind(6);
uf.union(0, 1);
uf.union(2, 3);
uf.union(1, 3);                                    // two rank-1 trees: 2 goes under 0
console.log(uf.connected(0, 2), uf.connected(0, 4)); // true false
console.log(uf.count);                             // 3
console.log(uf.parent);                            // [0, 0, 0, 2, 4, 5]
uf.find(3);                                        // walks 3 → 2 → 0 and re-points 3 at the root
console.log(uf.parent);                            // [0, 0, 0, 0, 4, 5]

console.log(countGroups(5, [[0, 1], [1, 2], [3, 4]]));            // 2
console.log(firstCycleEdge(4, [[0, 1], [1, 2], [2, 3], [3, 1]])); // [3, 1]

const emails = new KeyedUnionFind();
emails.union('ana@x.com', 'ana@work.com');
emails.union('ana@work.com', 'a.dev@z.com');
console.log(emails.sizeOf('a.dev@z.com'));         // 3
