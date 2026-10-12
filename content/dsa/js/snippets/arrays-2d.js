const rows = 3, cols = 4;

// WRONG: fill puts the SAME row object into every slot.
const shared = new Array(rows).fill(new Array(cols).fill(0));
shared[0][0] = 1;
console.log(shared.map((r) => r.join('')));  // ['1000', '1000', '1000']: every row changed
console.log(shared[0] === shared[2]);        // true: one row, three references

// The same trap with fill([]) for buckets or adjacency lists.
const buckets = new Array(3).fill([]);
buckets[0].push('x');
console.log(buckets);                        // [['x'], ['x'], ['x']]

// RIGHT: Array.from calls the function once per row, so every row is a new array.
const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
grid[0][0] = 1;
console.log(grid.map((r) => r.join('')));    // ['1000', '0000', '0000']
const adj = Array.from({ length: 3 }, () => []);
adj[0].push(1);
console.log(adj);                            // [[1], [], []]

// Copying a grid: [...grid] copies only the outer array; the rows are still shared.
const shallow = [...grid];
const deep = grid.map((row) => [...row]);    // or structuredClone(grid)
grid[1][1] = 7;
console.log(shallow[1][1], deep[1][1]);      // 7 0
