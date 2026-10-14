import unittest

from xor_tricks import missing_number, two_singles, xor_all


class XorTricksTest(unittest.TestCase):
    def test_pairs_cancel_and_the_odd_one_out_remains(self):
        self.assertEqual(xor_all([5, 9, 3, 12, 3, 5, 12]), 9)
        self.assertEqual(xor_all([2, -4, 2]), -4)
        self.assertEqual(xor_all([]), 0)

    def test_finds_the_missing_number_in_0_to_n(self):
        self.assertEqual(missing_number([4, 0, 1, 3]), 2)
        self.assertEqual(missing_number([0, 1, 2]), 3)
        self.assertEqual(missing_number([1]), 0)

    def test_separates_two_single_values(self):
        self.assertEqual(two_singles([1, 2, 1, 3, 2, 5]), [3, 5])
        self.assertEqual(two_singles([-1, 0]), [-1, 0])
        self.assertEqual(two_singles([4, 7, 4, 9, 7, 6]), [6, 9])


if __name__ == "__main__":
    unittest.main()
