from rules import Cap, NightDiscount
from strategy import HourlyRate

base = HourlyRate(20)

# Same three rules, two wrapping orders. Read from the inside out.
cap_then_discount = NightDiscount(Cap(base, 100), 50)  # the discount applies to the capped fee
discount_then_cap = Cap(NightDiscount(base, 50), 100)  # the cap applies to what the driver pays
