import { HourlyRate } from './strategy.js'; // @hide
import { NightDiscount, Cap } from './rules.js'; // @hide
// The new rule is BookingFee, a flat 5 on top of its inner rule. Move it inside or outside Cap and watch the total.
const stay = { minutes: 480, enterHour: 23, vehicle: 'car' }; // 8 hours, arrived at 11 pm
const base = new HourlyRate(20);                              // 160

class BookingFee {
  constructor(inner, amount) { this.inner = inner; this.amount = amount; }
  fee(stay) { return this.inner.fee(stay) + this.amount; }
}

const feeAfterCap = new BookingFee(new Cap(base, 100), 5);
const capAfterFee = new Cap(new BookingFee(base, 5), 100);
console.log(feeAfterCap.fee(stay));                         // 105: the cap comes first, the fee sits on top
console.log(capAfterFee.fee(stay));                         // 100: the booking fee is capped too
console.log(new NightDiscount(feeAfterCap, 50).fee(stay)); // 53: 52.5 rounds up
// Your turn: write a MemberDiscount that takes 10 off (never below 0) and wrap it somewhere.
