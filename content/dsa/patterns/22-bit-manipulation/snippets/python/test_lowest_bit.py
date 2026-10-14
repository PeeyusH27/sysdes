import unittest

from lowest_bit import count_bits_up_to, is_power_of_two, lowest_set_bit, popcount


class LowestBitTest(unittest.TestCase):
    def test_counts_set_bits_one_at_a_time(self):
        self.assertEqual(popcount(0), 0)
        self.assertEqual(popcount(44), 3)  # 101100
        self.assertEqual(popcount(2147483647), 31)
        self.assertEqual(popcount(-1), 32)  # all 32 bits of a negative 32-bit integer

    def test_recognises_powers_of_two(self):
        self.assertTrue(all(is_power_of_two(x) for x in [1, 2, 32, 1024]))
        self.assertFalse(any(is_power_of_two(x) for x in [0, 3, 6, 40, -8]))

    def test_isolates_the_lowest_set_bit(self):
        self.assertEqual(lowest_set_bit(44), 4)
        self.assertEqual(lowest_set_bit(40), 8)
        self.assertEqual(lowest_set_bit(0), 0)

    def test_counts_bits_for_every_number_up_to_n(self):
        self.assertEqual(count_bits_up_to(7), [0, 1, 1, 2, 1, 2, 2, 3])
        self.assertEqual(count_bits_up_to(0), [0])
        big = count_bits_up_to(1000)
        self.assertTrue(all(c == popcount(i) for i, c in enumerate(big)))


if __name__ == "__main__":
    unittest.main()
