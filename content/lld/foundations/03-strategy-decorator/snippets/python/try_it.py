from strategy import HourlyRate  # @hide
from rules import NightDiscount, Cap  # @hide
# The new rule is BookingFee, a flat 5 on top of its inner rule. Move it inside or outside Cap and watch the total.
stay = {"minutes": 480, "enter_hour": 23, "vehicle": "car"}  # 8 hours, arrived at 11 pm
base = HourlyRate(20)                                        # 160


class BookingFee:
    def __init__(self, inner, amount):
        self.inner = inner
        self.amount = amount

    def fee(self, stay):
        return self.inner.fee(stay) + self.amount


fee_after_cap = BookingFee(Cap(base, 100), 5)
cap_after_fee = Cap(BookingFee(base, 5), 100)
print(fee_after_cap.fee(stay))                         # 105: the cap comes first, the fee sits on top
print(cap_after_fee.fee(stay))                         # 100: the booking fee is capped too
print(NightDiscount(fee_after_cap, 50).fee(stay))      # 53: 52.5 rounds up
# Your turn: write a MemberDiscount that takes 10 off (never below 0) and wrap it somewhere.
