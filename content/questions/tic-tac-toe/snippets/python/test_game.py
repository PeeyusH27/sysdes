"""Run from this folder:  python3 -m unittest test_game"""
import random
import threading
import unittest

from board import Board
from bots import first_free, free, sensible
from game import Game


def play(g, *moves):
    return [g.move(m, r, c) for m, r, c in moves]


def scan(board, m):
    n = board.n
    lines = [board.cells[i] for i in range(n)] + [[board.cells[r][i] for r in range(n)] for i in range(n)]
    lines += [[board.cells[i][i] for i in range(n)], [board.cells[i][n - 1 - i] for i in range(n)]]
    return any(all(x == m for x in line) for line in lines)


class GameTest(unittest.TestCase):
    def test_x_wins_a_row_and_the_game_then_refuses_every_move(self):
        g = Game()
        self.assertEqual(play(g, ("X", 0, 0), ("O", 1, 0), ("X", 0, 1), ("O", 1, 1), ("X", 0, 2))[-1], "WIN")
        self.assertEqual((g.status, g.winner), ("WON", "X"))
        self.assertEqual(g.move("O", 2, 2), "GAME_OVER")

    def test_both_diagonals_win(self):
        self.assertEqual(play(Game(), ("X", 0, 0), ("O", 0, 1), ("X", 1, 1), ("O", 0, 2), ("X", 2, 2))[-1], "WIN")
        self.assertEqual(play(Game(), ("X", 0, 2), ("O", 0, 0), ("X", 1, 1), ("O", 0, 1), ("X", 2, 0))[-1], "WIN")

    def test_a_mixed_line_never_counts(self):
        self.assertEqual(play(Game(), ("X", 0, 0), ("O", 0, 1), ("X", 0, 2)), ["OK", "OK", "OK"])

    def test_a_full_board_with_no_line_is_a_draw_and_a_last_move_that_completes_a_line_is_a_win(self):
        draw = Game()
        results = play(draw, ("X", 0, 0), ("O", 0, 1), ("X", 0, 2), ("O", 1, 1), ("X", 1, 0), ("O", 1, 2),
                       ("X", 2, 1), ("O", 2, 0), ("X", 2, 2))
        self.assertEqual((results[-1], draw.status, draw.winner), ("DRAW", "DRAW", None))
        win = Game()
        last = play(win, ("X", 0, 0), ("O", 0, 1), ("X", 1, 1), ("O", 0, 2), ("X", 1, 2), ("O", 1, 0),
                    ("X", 2, 0), ("O", 2, 1), ("X", 2, 2))
        self.assertEqual((last[-1], win.board.is_full(), win.status), ("WIN", True, "WON"))

    def test_rejected_moves_change_nothing_and_do_not_use_up_the_turn(self):
        g = Game()
        self.assertEqual(g.move("O", 0, 0), "NOT_YOUR_TURN")
        self.assertEqual(g.move("X", 3, 0), "INVALID_MOVE")
        self.assertEqual(g.move("X", 0, 0), "OK")
        self.assertEqual(g.move("O", 0, 0), "INVALID_MOVE")
        self.assertEqual((g.current, g.version, g.board.filled), ("O", 1, 1))

    def test_undo_takes_back_a_winning_move(self):
        g = Game()
        play(g, ("X", 0, 0), ("O", 1, 0), ("X", 0, 1), ("O", 1, 1), ("X", 0, 2))
        self.assertTrue(g.undo())
        self.assertEqual((g.status, g.winner, g.current, g.board.filled), ("IN_PROGRESS", None, "X", 4))
        self.assertEqual(g.move("X", 2, 2), "OK")
        self.assertEqual(g.move("O", 1, 2), "WIN")
        self.assertFalse(Game().undo())

    def test_a_stale_version_is_refused(self):
        g = Game()
        self.assertEqual(g.move("X", 0, 0, 0), "OK")
        self.assertEqual(g.move("O", 1, 1, 0), "STALE")
        self.assertEqual(g.move("O", 1, 1, 1), "OK")

    def test_would_complete_is_read_only(self):
        g = Game()
        play(g, ("X", 0, 0), ("O", 1, 0), ("X", 0, 1))
        before = (g.board.filled, list(g.board.rows))
        self.assertTrue(g.board.would_complete("X", 0, 2))
        self.assertFalse(g.board.would_complete("O", 0, 2))
        self.assertEqual((g.board.filled, g.board.rows), before)

    def test_the_counters_agree_with_a_brute_force_scan_over_300_random_4x4_games(self):
        rnd = random.Random(11)
        for _ in range(300):
            g = Game(4)
            while g.status == "IN_PROGRESS":
                r, c = rnd.choice(free(g.board))
                mark = g.current
                res = g.move(mark, r, c)
                self.assertEqual(res == "WIN", scan(g.board, mark))

    def test_bots_take_the_win_else_block_else_the_middle_else_the_first_free_cell(self):
        self.assertEqual(sensible(Board(3), "X"), (1, 1))
        g = Game()
        play(g, ("X", 0, 0), ("O", 1, 0), ("X", 0, 1), ("O", 1, 1), ("X", 2, 2))
        self.assertEqual(sensible(g.board, "O"), (1, 2))
        h = Game()
        play(h, ("X", 0, 0), ("O", 1, 1), ("X", 0, 1))
        self.assertEqual(sensible(h.board, "O"), (0, 2))
        self.assertEqual(first_free(h.board, "O"), (0, 2))

    def test_a_500_by_500_board_plays_a_winning_row_without_scanning_anything(self):
        g = Game(500)
        res = None
        for c in range(500):
            res = g.move("X", 0, c)
            if c < 499:
                g.move("O", 1, c)
        self.assertEqual(res, "WIN")
        self.assertEqual(first_free(g.board, "O"), (1, 499))

    def test_two_threads_race_for_the_same_move_and_exactly_one_wins(self):
        for _ in range(200):
            g = Game()
            out = []
            go = threading.Event()

            def work():
                go.wait()
                out.append(g.move("X", 0, 0, 0))  # both saw version 0

            threads = [threading.Thread(target=work) for _ in range(2)]
            for t in threads:
                t.start()
            go.set()
            for t in threads:
                t.join()
            self.assertEqual(sorted(out), ["OK", "STALE"])
            self.assertEqual(g.board.filled, 1)


if __name__ == "__main__":
    unittest.main()
