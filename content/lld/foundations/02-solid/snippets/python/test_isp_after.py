import unittest

from isp_after import Card, Cash, checkout, refund_all


class FakeCharger:
    def charge(self, cents):
        return f"fake {cents}"


class IspAfterTest(unittest.TestCase):
    def test_checkout_needs_one_role_so_a_one_method_fake_is_enough(self):
        self.assertEqual(checkout(Cash(), 100), "took 100 in cash")
        self.assertEqual(checkout(FakeCharger(), 100), "fake 100")

    def test_refunds_go_only_to_things_that_can_refund(self):
        self.assertEqual(refund_all([Card()], 100), ["sent 100 back to the card"])

    def test_cash_simply_has_no_refund_so_it_cannot_be_handed_to_refund_all_by_mistake(self):
        self.assertFalse(hasattr(Cash(), "refund"))
        self.assertFalse(hasattr(Cash(), "save_card"))


if __name__ == "__main__":
    unittest.main()
