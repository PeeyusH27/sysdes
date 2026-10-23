"""Run from this folder:  python3 -m unittest test_game"""
import random
import threading
import unittest

from game import Game
from models import Board, Event, FixedDice, MoveResult, RandomDice, bounce, exact, finish


def make(rolls, jumps=None, size=10, rule=finish, six_again=False):
    return Game(Board(size, jumps or {}), ["A", "B"], FixedDice(*rolls), rule, six_again)


class GameTest(unittest.TestCase):
    def test_players_alternate_and_each_move_reports_where_it_started_and_ended(self):
        g = make([3, 4])
        self.assertEqual(g.play(), MoveResult("A", 3, 0, 3, Event.MOVE))
        self.assertEqual(g.play(), MoveResult("B", 4, 0, 4, Event.MOVE))
        self.assertEqual(g.play().player, "A")

    def test_a_ladder_carries_the_player_up(self):
        r = make([3], {3: 8}).play()
        self.assertEqual((r.to, r.event), (8, Event.LADDER))

    def test_a_snake_carries_the_player_down(self):
        g = make([5], {9: 2})
        g.position["A"] = 4
        r = g.play()
        self.assertEqual((r.from_, r.to, r.event), (4, 2, Event.SNAKE))

    def test_exact_rule_an_overshoot_stays_put_and_an_exact_landing_wins(self):
        g = make([3, 1, 2], rule=exact)
        g.position["A"] = 8
        r = g.play()
        self.assertEqual((r.player, r.to, r.event), ("A", 8, Event.STAY))
        g.play()  # B rolls 1
        r = g.play()
        self.assertEqual((r.to, r.event), (10, Event.WIN))
        self.assertEqual(g.winner, "A")

    def test_finish_rule_any_roll_that_reaches_the_last_square_wins(self):
        g = make([5], rule=finish)
        g.position["A"] = 8
        r = g.play()
        self.assertEqual((r.to, r.event), (10, Event.WIN))

    def test_bounce_rule_the_extra_steps_walk_back_from_the_last_square(self):
        self.assertEqual([bounce(8, 4, 10), bounce(8, 6, 10), bounce(8, 2, 10)], [8, 6, 10])

    def test_a_six_gives_another_turn_only_when_the_rule_is_on(self):
        on = make([6, 2], six_again=True)
        self.assertEqual([on.play().player for _ in range(3)], ["A", "A", "B"])
        off = make([6, 2])
        self.assertEqual([off.play().player for _ in range(2)], ["A", "B"])

    def test_a_ladder_to_the_last_square_wins(self):
        r = make([2], {2: 10}).play()
        self.assertEqual((r.to, r.event), (10, Event.WIN))

    def test_after_a_win_nothing_moves_any_more(self):
        g = make([6])
        g.position["A"] = 6
        g.play()
        self.assertIsNone(g.play())
        self.assertEqual(g.position["B"], 0)

    def test_the_board_rejects_jumps_that_would_break_the_game(self):
        for jumps in ({10: 3}, {4: 11}, {4: 4}, {3: 6, 6: 1}):  # last square, off board, nowhere, a chain
            with self.assertRaises(ValueError, msg=str(jumps)):
                Board(10, jumps)
        self.assertEqual(Board(10, {3: 6, 8: 1}).land(8), 1)

    def test_listeners_hear_every_move(self):
        g = make([1, 2])
        heard = []
        g.on(lambda r: heard.append(f"{r.player}:{r.to}"))
        g.play()
        g.play()
        self.assertEqual(heard, ["A:1", "B:2"])

    def test_the_dice_are_swappable_fixed_rolls_repeat_seeded_random_rolls_stay_in_1_to_6(self):
        fixed = FixedDice(2, 5)
        self.assertEqual([fixed.roll() for _ in range(3)], [2, 5, 2])
        dice = RandomDice(random.Random(11))
        rolls = {dice.roll() for _ in range(600)}
        self.assertEqual(rolls, {1, 2, 3, 4, 5, 6})

    def test_one_game_shared_by_4_threads_exactly_one_winner_every_move_heard_once(self):
        g = Game(Board(30, {3: 12, 20: 6}), ["A", "B", "C"], RandomDice(random.Random(5)), exact, True)
        heard, wins, played = [], [], []
        g.on(lambda r: (heard.append(1), wins.append(1) if r.event is Event.WIN else None))

        def work():
            for _ in range(5000):
                if g.play() is None:
                    break
                played.append(1)

        threads = [threading.Thread(target=work) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(len(wins), 1)
        self.assertIsNotNone(g.winner)
        self.assertEqual(len(heard), len(played))

    def test_8_independent_games_on_8_threads_all_finish(self):
        results = []

        def run(seed):
            g = Game(Board(30, {4: 14, 17: 7}), ["A", "B"], RandomDice(random.Random(seed)), finish)
            for _ in range(10000):
                if g.winner is not None:
                    break
                g.play()
            results.append(g.winner is not None)

        threads = [threading.Thread(target=run, args=(s,)) for s in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(results, [True] * 8)


if __name__ == "__main__":
    unittest.main()
