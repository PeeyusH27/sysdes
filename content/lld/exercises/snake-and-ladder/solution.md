Snake and Ladder is a small game with one big trap: the rules people argue about (what happens at the end of the board, whether a six repeats) are exactly the rules that change. The design keeps those in one place each and everything else plain.

1. **One idea for both jumps.** A snake and a ladder are a map from a start square to an end square. Whether it is a snake is just whether the end is lower. Two maps (as the config gives them) are fine, but there is no `Snake` and `Ladder` class hierarchy, because they behave the same.
2. **Validate once, in the constructor.** All the rules for a bad config are checked up front and the answer is stored in `valid`. Every public method starts with a check on it. Doing it this way means a bad board can never half-work, and it is why a bad config returns sentinels instead of throwing.
3. **Kill chains instead of following them.** If a jump could land on another jump's start, a ladder could feed a snake that feeds the ladder, and a turn would never end. The simplest cure is to refuse that layout. The alternative (follow jumps in a loop, remember visited squares) is a good follow-up, and costs more code.
4. **Make the ending rule a function in a table.** `exact`, `finish` and `bounce` each map `(position, roll, size)` to a landing square, or `null` when the move is refused. A fourth rule is one more entry. Nothing in `turn` mentions a rule by name beyond the lookup.
5. **Order the steps of a turn.** Roll, ask the rule for a landing square, take at most one jump, check for the win on the final square (a ladder to the last square counts), then pass the turn. The win check comes after the jump on purpose.
6. **Treat the six as a turn-passing rule, not a move rule.** Whether the same player rolls again depends only on the roll, `sixAgain` and whether someone has won. It does not depend on whether the move was refused, which is what the exact-rule test checks.
7. **Inject the dice.** The `rolls` list repeats forever, so a test can say "the third roll is a 6". The real game would pass a random dice object with the same single method.

Where the design bends: a new ending rule is one table entry. A second dice (or a loaded one) replaces the roll line. An event stream is a list of listeners called with each result. For a server, one game is one writer: wrap `turn` in a lock, or give each game a single owner thread, and games never share state.

Cost: each turn is O(1). Validation is O(jumps + players), done once.
