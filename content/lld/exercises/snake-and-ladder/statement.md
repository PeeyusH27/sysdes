Build the engine of a **Snake and Ladder** game. Players start off the board at square `0` and take turns rolling. A snake or ladder on the landing square moves the player again. The first player to reach the last square wins. The class must not contain an `if (rule === ...)` ladder for the three ways of ending the game, and adding a fourth rule later must not mean editing the three that already work. The dice are a fixed list of rolls, so every game is repeatable: that is how real code keeps dice injectable.

Implement the class `Game`:

- `Game(config)`: `config` is an object with
  - `size`: the number of squares; the last square is `size`.
  - `snakes`: an object from the snake's head square to its tail square, such as `{"17": 7}`. A snake moves a player **down**.
  - `ladders`: an object from the ladder's bottom square to its top square, such as `{"4": 14}`. A ladder moves a player **up**.
  - `players`: the names, in turn order.
  - `rolls`: the dice. The nth roll of the game is `rolls[n mod rolls.length]` (the list repeats).
  - `rule`: `"exact"`, `"finish"` or `"bounce"`, described below.
  - `sixAgain`: `true` if rolling a 6 gives the same player another turn.
- `isValid()`: `true` if the config is valid (rules below).
- `turn()`: plays one roll by the player whose turn it is, and returns `{player, roll, from, to, event}`.
- `position(player)`: the player's square, `0` before they enter the board.
- `winner()`: the winner's name, or `""` if nobody has won.
- `next()`: the name of the player who rolls next, or `""` if the game is over.

**What one turn does.** With position `p` and roll `r`, the ending rule gives a landing square `L` or refuses the move:

- `"exact"`: `L = p + r`. If that is above `size`, the move is refused and the player stays.
- `"finish"`: `L = min(p + r, size)`.
- `"bounce"`: if `p + r` is above `size`, `L = size - (p + r - size)`, otherwise `L = p + r`.

If the move is refused, `to` equals `from` and `event` is `"stay"`. Otherwise, if `L` is the head of a snake or the bottom of a ladder, the player moves to the other end, and `event` is `"snake"` or `"ladder"`. Without a jump, `to = L` and `event` is `"move"`. Whenever the player ends on square `size`, even by ladder, `event` is `"win"`, they win and the game is over. A jump is taken at most once per turn.

The turn then passes to the next player in the list, wrapping around. The exception: if `sixAgain` is `true`, the roll was a 6 and nobody has won, the same player rolls again, even if the move was refused.

**A config is invalid** if any of these holds:

- `size` is not an integer of at least 6.
- `players` has fewer than 2 names, or a repeated name.
- `rolls` is empty, or has anything but whole numbers from 1 to 6.
- `rule` is not one of the three names.
- A snake's head is not above its tail, a ladder's top is not above its bottom, any end is below 1 or above `size`, or a head or bottom is on the last square.
- A square is the start of both a snake and a ladder.
- A jump ends on a square where another jump starts (a chain).

An invalid game still constructs. `isValid()` is `false`, and then `turn()` returns `"INVALID"`, `position` returns `-1`, `winner()` and `next()` return `""`.

**Notes**

- After someone has won, `turn()` returns `"OVER"` and nothing moves. `position` of a name that is not a player returns `-1`.
- Snake and ladder squares are object keys, so they arrive as strings. Convert them.
- Return values must be exactly the types above.
