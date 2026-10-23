import unittest

from isp_before import Card, Cash, refund_all


class IspBeforeTest(unittest.TestCase):
    def test_a_stub_that_throws_turns_one_bad_entry_into_a_crash_for_the_whole_batch(self):
        self.assertEqual(refund_all([Card()], 100), ["sent 100 back to the card"])
        with self.assertRaisesRegex(RuntimeError, "refunded at the desk"):
            refund_all([Card(), Cash()], 100)


if __name__ == "__main__":
    unittest.main()
