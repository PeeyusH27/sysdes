# In Python a function is the simplest strategy, and a function that wraps a function is the simplest decorator.
def hourly(rate):
    return lambda stay: (stay["minutes"] + 59) // 60 * rate


def capped(fee, maximum):
    return lambda stay: min(fee(stay), maximum)


def nightly(fee, percent_off):
    def priced(stay):
        night = stay["enter_hour"] >= 22 or stay["enter_hour"] < 6
        base = fee(stay)
        return (base * (100 - percent_off) + 50) // 100 if night else base
    return priced


price = capped(nightly(hourly(20), 50), 100)  # cap(discount(base)): read from the inside out
