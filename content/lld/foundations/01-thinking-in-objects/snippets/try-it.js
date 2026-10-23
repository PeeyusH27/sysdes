import { Library, Member } from './library-after.js'; // @hide
// Change a limit, a loan period or a day, then press Run.
const lib = new Library();
lib.addBook('b1', 'Dune', 1);
lib.addBook('b2', 'Emma', 2);
lib.join(new Member('ana', 'Ana', 1));          // limit 1; try 2
lib.join(new Member('sam', 'Sam', 3, 7));       // a student: 7 days

console.log(lib.borrow('ana', 'b1', 0) !== null);  // true
console.log(lib.borrow('ana', 'b2', 0) !== null);  // false: Ana is at her limit
console.log(lib.borrow('sam', 'b2', 0).dueDay);    // 7
console.log(lib.giveBack('ana', 'b1', 20));        // 3: six days late at 0.5
console.log(lib.giveBack('sam', 'b2', 10));        // 1.5: three days late
