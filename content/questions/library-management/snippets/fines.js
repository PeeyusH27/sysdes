// Strategy: a fine policy turns "days late" into cents. Decorators wrap one policy in another.
export class PerDayFine {
  constructor(centsPerDay) { this.centsPerDay = centsPerDay; }
  fine(daysLate) { return Math.max(0, daysLate) * this.centsPerDay; }
}

export class CappedFine {                    // never more than the book is worth
  constructor(inner, capCents) { Object.assign(this, { inner, capCents }); }
  fine(daysLate) { return Math.min(this.capCents, this.inner.fine(daysLate)); }
}

export class GraceFine {                     // the first few late days are free
  constructor(inner, graceDays) { Object.assign(this, { inner, graceDays }); }
  fine(daysLate) { return this.inner.fine(Math.max(0, daysLate - this.graceDays)); }
}
