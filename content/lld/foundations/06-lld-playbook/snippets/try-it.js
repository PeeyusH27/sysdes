import { RoomHolds } from './hold.js'; // @hide
// The clock is a variable you control. Move it and watch the hold expire.
let t = 0; // milliseconds
const holds = new RoomHolds(() => t); // the default hold lasts 10 minutes

console.log(holds.hold('A'));   // true
t = 599_999;
console.log(holds.hold('A'));   // false: one millisecond left
t = 600_000;
console.log(holds.hold('A'));   // true: the hold expired, so a new one starts
console.log(holds.isHeld('A')); // true
