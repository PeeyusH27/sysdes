import unittest

from life import game_of_life, next_generation


class LifeTest(unittest.TestCase):
    def test_a_blinker_flips_between_a_vertical_and_a_horizontal_bar(self):
        b = [[0, 1, 0], [0, 1, 0], [0, 1, 0]]
        game_of_life(b)
        self.assertEqual(b, [[0, 0, 0], [1, 1, 1], [0, 0, 0]])
        game_of_life(b)
        self.assertEqual(b, [[0, 1, 0], [0, 1, 0], [0, 1, 0]])

    def test_a_block_is_stable_and_a_lone_cell_dies(self):
        block = [[1, 1], [1, 1]]
        game_of_life(block)
        self.assertEqual(block, [[1, 1], [1, 1]])
        lone = [[1]]
        game_of_life(lone)
        self.assertEqual(lone, [[0]])

    def test_the_in_place_version_matches_the_copying_version(self):
        start = [[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]
        want = next_generation(start)
        self.assertEqual(want, [[0, 0, 0], [1, 0, 1], [0, 1, 1], [0, 1, 0]])
        b = [row[:] for row in start]
        game_of_life(b)
        self.assertEqual(b, want)


if __name__ == "__main__":
    unittest.main()
