import { HourlyRate } from './strategy.js';
import { Cap, NightDiscount } from './rules.js';

const base = new HourlyRate(20);

// Same three rules, two wrapping orders. Read from the inside out.
export const capThenDiscount = new NightDiscount(new Cap(base, 100), 50);  // the discount applies to the capped fee
export const discountThenCap = new Cap(new NightDiscount(base, 50), 100);  // the cap applies to what the driver pays
