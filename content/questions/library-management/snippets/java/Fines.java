// Strategy: a fine policy turns "days late" into cents. Decorators wrap one policy in another.
interface FinePolicy {
    int fine(int daysLate);
}

record PerDayFine(int centsPerDay) implements FinePolicy {
    @Override public int fine(int daysLate) { return Math.max(0, daysLate) * centsPerDay; }
}

record CappedFine(FinePolicy inner, int capCents) implements FinePolicy {  // never more than the book is worth
    @Override public int fine(int daysLate) { return Math.min(capCents, inner.fine(daysLate)); }
}

record GraceFine(FinePolicy inner, int graceDays) implements FinePolicy {  // the first few late days are free
    @Override public int fine(int daysLate) { return inner.fine(Math.max(0, daysLate - graceDays)); }
}
