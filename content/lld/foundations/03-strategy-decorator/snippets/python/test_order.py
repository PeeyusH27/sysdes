import unittest

from order import cap_then_discount, discount_then_cap

NIGHT_8H = {"minutes": 480, "enter_hour": 23}  # 8 hours at 20 = 160 before any rule
DAY_8H = {"minutes": 480, "enter_hour": 12}
NIGHT_2H = {"minutes": 120, "enter_hour": 23}


class OrderTest(unittest.TestCase):
    def test_wrapping_order_changes_the_answer_for_a_long_night_stay(self):
        self.assertEqual(cap_then_discount.fee(NIGHT_8H), 50)  # 160 -> cap 100 -> half 50
        self.assertEqual(discount_then_cap.fee(NIGHT_8H), 80)  # 160 -> half 80 -> cap leaves 80

    def test_the_two_orders_agree_when_the_rules_do_not_overlap(self):
        self.assertEqual(cap_then_discount.fee(DAY_8H), 100)
        self.assertEqual(discount_then_cap.fee(DAY_8H), 100)
        self.assertEqual(cap_then_discount.fee(NIGHT_2H), 20)
        self.assertEqual(discount_then_cap.fee(NIGHT_2H), 20)


if __name__ == "__main__":
    unittest.main()
