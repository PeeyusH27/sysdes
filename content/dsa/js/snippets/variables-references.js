// Primitives are copied by value.
let a = 5;
let b = a;
b++;
console.log(a, b);                  // 5 6

// Arrays, objects, Maps and Sets are references: assignment copies the pointer, not the data.
const row = [0, 0, 0];
const alias = row;
alias[0] = 9;
console.log(row, row === alias);    // [9, 0, 0] true: one array, two names

const copy = [...row];              // a new array holding the same items
copy[1] = 7;
console.log(row, copy);             // [9, 0, 0] [9, 7, 0]

// A function gets the reference: mutating the parameter changes the caller's array...
function zeroFirst(arr) { arr[0] = 0; }
zeroFirst(row);
console.log(row);                   // [0, 0, 0]

// ...but reassigning the parameter only rebinds the local name.
function replaceAll(arr) { arr = [1, 2, 3]; }
replaceAll(row);
console.log(row);                   // [0, 0, 0]: the caller never sees the new array

// The backtracking bug: pushing the live path stores the same array every time.
const path = [];
const wrong = [];
const right = [];
for (const x of [1, 2, 3]) {
  path.push(x);
  wrong.push(path);                 // a reference to the one shared array
  right.push([...path]);            // a snapshot of its current contents
}
path.length = 0;                    // backtracking eventually empties the path
console.log(wrong);                 // [[], [], []]
console.log(right);                 // [[1], [1, 2], [1, 2, 3]]
