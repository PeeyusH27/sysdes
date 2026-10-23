# Strategy: an ending rule maps (position, roll, size) to a landing square, or None if the move is refused.
# A fourth rule is one new entry here, and Game never changes.
RULES = {
    "exact": lambda p, r, size: None if p + r > size else p + r,
    "finish": lambda p, r, size: min(p + r, size),
    "bounce": lambda p, r, size: size - (p + r - size) if p + r > size else p + r,
}


def _to_map(obj):
    return {int(k): v for k, v in (obj or {}).items()}


def _is_int(x):
    return isinstance(x, int) and not isinstance(x, bool)


class Game:
    def __init__(self, config):
        self.size = config.get("size")
        self.snakes = _to_map(config.get("snakes"))
        self.ladders = _to_map(config.get("ladders"))
        self.players = config.get("players")
        self.rolls = config.get("rolls")
        self.rule = config.get("rule")
        self.six_again = config.get("sixAgain") is True
        self.valid = self._validate()
        self.pos = {p: 0 for p in (self.players or [])}
        self.turn_index = 0
        self.roll_count = 0
        self.won = ""

    def _validate(self):
        """Check everything up front, so a bad config can never half-work."""
        size, players, rolls = self.size, self.players, self.rolls
        if not _is_int(size) or size < 6:
            return False
        if not isinstance(players, list) or len(players) < 2 or len(set(players)) != len(players):
            return False
        if not isinstance(rolls, list) or not rolls or not all(_is_int(r) and 1 <= r <= 6 for r in rolls):
            return False
        if self.rule not in RULES:
            return False

        def in_range(s):
            return _is_int(s) and 1 <= s <= size

        for table, down in ((self.snakes, True), (self.ladders, False)):
            for start, end in table.items():
                if not in_range(start) or not in_range(end) or start >= size:
                    return False
                if (start <= end) if down else (end <= start):
                    return False
        if set(self.snakes) & set(self.ladders):
            return False
        starts = set(self.snakes) | set(self.ladders)
        for end in list(self.snakes.values()) + list(self.ladders.values()):
            if end in starts:  # a chain
                return False
        return True

    def is_valid(self):
        return self.valid

    def turn(self):
        if not self.valid:
            return "INVALID"
        if self.won:
            return "OVER"
        player = self.players[self.turn_index]
        roll = self.rolls[self.roll_count % len(self.rolls)]
        self.roll_count += 1
        start = self.pos[player]
        landed = RULES[self.rule](start, roll, self.size)
        end, event = start, "stay"
        if landed is not None:
            end, event = landed, "move"
            if landed in self.snakes:
                end, event = self.snakes[landed], "snake"
            elif landed in self.ladders:
                end, event = self.ladders[landed], "ladder"
        if end == self.size:
            event, self.won = "win", player
        self.pos[player] = end
        if not self.won and not (roll == 6 and self.six_again):
            self.turn_index = (self.turn_index + 1) % len(self.players)
        return {"player": player, "roll": roll, "from": start, "to": end, "event": event}

    def position(self, player):
        return self.pos[player] if self.valid and player in self.pos else -1

    def winner(self):
        return self.won

    def next(self):
        return self.players[self.turn_index] if self.valid and not self.won else ""
