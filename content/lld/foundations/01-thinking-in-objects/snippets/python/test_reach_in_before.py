import unittest

from reach_in_before import Member, borrow_at_desk, borrow_at_kiosk


class ReachInBeforeTest(unittest.TestCase):
    def test_the_kiosk_path_walks_straight_past_the_limit(self):
        m = Member(1)
        self.assertTrue(borrow_at_desk(m, "a"))
        self.assertFalse(borrow_at_desk(m, "b"))
        self.assertTrue(borrow_at_kiosk(m, "b"))
        self.assertEqual(m.loans, ["a", "b"])  # two loans, limit one


if __name__ == "__main__":
    unittest.main()
