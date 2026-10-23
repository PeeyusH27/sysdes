class FinePolicy:
    """Strategy: a fine policy turns 'days late' into cents. Decorators wrap one policy in another."""

    def fine(self, days_late: int) -> int:
        raise NotImplementedError


class PerDayFine(FinePolicy):
    def __init__(self, cents_per_day: int):
        self.cents_per_day = cents_per_day

    def fine(self, days_late: int) -> int:
        return max(0, days_late) * self.cents_per_day


class CappedFine(FinePolicy):  # never more than the book is worth
    def __init__(self, inner: FinePolicy, cap_cents: int):
        self.inner, self.cap_cents = inner, cap_cents

    def fine(self, days_late: int) -> int:
        return min(self.cap_cents, self.inner.fine(days_late))


class GraceFine(FinePolicy):  # the first few late days are free
    def __init__(self, inner: FinePolicy, grace_days: int):
        self.inner, self.grace_days = inner, grace_days

    def fine(self, days_late: int) -> int:
        return self.inner.fine(max(0, days_late - self.grace_days))
