import unittest

from sequence import Loop, floyd


def digit_squares(n):
    return sum(int(d) ** 2 for d in str(n))


class TestSequence(unittest.TestCase):
    def test_finds_the_cycle_of_a_lookup_table(self):
        table = [4, 0, 7, 2, 6, 3, 2, 5]
        self.assertEqual(floyd(lambda x: table[x], 0), Loop(start=2, tail=3, length=4))
        self.assertEqual(floyd(lambda x: (x * x + 1) % 10, 3), Loop(start=0, tail=1, length=6))

    def test_happy_numbers_end_in_the_1_to_1_loop(self):
        self.assertEqual(floyd(digit_squares, 19), Loop(start=1, tail=4, length=1))
        self.assertEqual(floyd(digit_squares, 1), Loop(start=1, tail=0, length=1))
        self.assertEqual(floyd(digit_squares, 2), Loop(start=4, tail=1, length=8))

    def test_the_duplicate_in_1_to_n_values_is_the_entry_of_the_index_walk_from_0(self):
        nums = [4, 3, 1, 4, 2]
        self.assertEqual(floyd(lambda i: nums[i], 0).start, 4)


if __name__ == "__main__":
    unittest.main()
