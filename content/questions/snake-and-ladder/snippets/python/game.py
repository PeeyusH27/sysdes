import threading
from typing import Callable, Dict, List, Optional

from models import Board, Event, MoveResult, Rule, exact


class Game:
    def __init__(self, board: Board, players: List[str], dice, rule: Rule = exact, six_again: bool = False):
        self.board, self.players, self.dice, self.rule, self.six_again = board, list(players), dice, rule, six_again
        self.position: Dict[str, int] = {p: 0 for p in players}  # 0 means "not on the board yet"
        self.turn = 0  # index into players
        self.winner: Optional[str] = None
        self._listeners: List[Callable[[MoveResult], None]] = []
        # One game is one lock: two threads rolling "at once" take turns, and different games never wait for each other.
        self._lock = threading.Lock()

    def on(self, listener: Callable[[MoveResult], None]) -> None:  # observer: a UI, a log or a test
        self._listeners.append(listener)

    def play(self) -> Optional[MoveResult]:
        """One roll by whoever is next. None once someone has won."""
        with self._lock:
            if self.winner is not None:
                return None
            player = self.players[self.turn]
            roll = self.dice.roll()
            start = self.position[player]
            landed = self.rule(start, roll, self.board.size)
            end = start if landed is None else self.board.land(landed)
            event = Event.STAY if landed is None else self.board.kind_at(landed)
            if end == self.board.size:
                event, self.winner = Event.WIN, player
            self.position[player] = end
            if self.winner is None and not (roll == 6 and self.six_again):
                self.turn = (self.turn + 1) % len(self.players)
            result = MoveResult(player, roll, start, end, event)
        for listener in self._listeners:
            listener(result)
        return result
