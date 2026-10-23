import unittest

from ocp_after import Pricing, percent_off


def pricing():
    return Pricing().register("gold", percent_off(10)).register("employee", percent_off(30))


class OcpAfterTest(unittest.TestCase):
    def test_registered_kinds_get_their_discount_and_unknown_kinds_pay_in_full(self):
        self.assertEqual(pricing().price("gold", 2000), 1800)
        self.assertEqual(pricing().price("employee", 2000), 1400)
        self.assertEqual(pricing().price("guest", 2000), 2000)

    def test_a_student_rule_is_added_without_editing_pricing(self):
        self.assertEqual(pricing().register("student", percent_off(15)).price("student", 2000), 1700)

    def test_a_rule_need_not_be_a_percentage(self):
        self.assertEqual(pricing().register("promo", lambda cents: 500).price("promo", 2000), 1500)


if __name__ == "__main__":
    unittest.main()
