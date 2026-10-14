import unittest

from bit_masks import clear_bit, get_bit, reverse_bits, set_bit, to_int32, toggle_bit


class BitMasksTest(unittest.TestCase):
    def test_reads_single_bits(self):
        self.assertEqual([get_bit(0b1010, i) for i in (3, 2, 1, 0)], [1, 0, 1, 0])
        self.assertEqual(get_bit(-1, 31), 1)  # negative ints behave as all ones in two's complement

    def test_sets_clears_and_toggles_one_bit_without_touching_the_others(self):
        self.assertEqual(set_bit(0b1000, 1), 0b1010)
        self.assertEqual(set_bit(0b1010, 1), 0b1010)
        self.assertEqual(clear_bit(0b1111, 2), 0b1011)
        self.assertEqual(clear_bit(0b1011, 2), 0b1011)
        self.assertEqual(toggle_bit(0b0101, 0), 0b0100)
        self.assertEqual(toggle_bit(0b0101, 1), 0b0111)

    def test_bit_31_is_only_negative_in_a_signed_32_bit_view(self):
        self.assertEqual(set_bit(0, 31), 2147483648)           # Python ints do not wrap
        self.assertEqual(to_int32(set_bit(0, 31)), -2147483648)  # what JavaScript / Java would show

    def test_reverses_all_32_bits_as_an_unsigned_number(self):
        self.assertEqual(reverse_bits(1), 2147483648)
        self.assertEqual(reverse_bits(6), 1610612736)
        self.assertEqual(reverse_bits(0), 0)
        self.assertEqual(reverse_bits(4294967295), 4294967295)
        self.assertEqual(reverse_bits(2147483648), 1)
        self.assertEqual(reverse_bits(-1), 4294967295)  # a negative input is read as its 32-bit pattern


if __name__ == "__main__":
    unittest.main()
