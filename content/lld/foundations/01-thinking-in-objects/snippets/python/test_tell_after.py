import unittest

from tell_after import Member


class TellAfterTest(unittest.TestCase):
    def test_the_limit_holds_for_every_caller_and_returning_frees_a_slot(self):
        m = Member(1)
        self.assertTrue(m.borrow("a"))
        self.assertFalse(m.borrow("b"))
        self.assertTrue(m.give_back("a"))
        self.assertTrue(m.borrow("b"))

    def test_the_list_handed_out_is_a_copy(self):
        m = Member(1)
        m.borrow("a")
        m.loans.append("sneaky")
        self.assertEqual(m.loans, ["a"])


if __name__ == "__main__":
    unittest.main()
