import java.util.*;
import java.util.function.DoubleSupplier;

enum Event { MOVE, LADDER, SNAKE, STAY, WIN }

record MoveResult(String player, int roll, int from, int to, Event event) {}

// A snake and a ladder are the same thing pointing different ways, so the board stores one map of jumps.
final class Board {
    private final int size;
    private final Map<Integer, Integer> jumps;

    Board(int size, Map<Integer, Integer> jumps) {  // e.g. {4: 14, 17: 7}
        for (Map.Entry<Integer, Integer> j : jumps.entrySet()) {
            int from = j.getKey();
            int to = j.getValue();
            if (from < 1 || from >= size) throw new IllegalArgumentException("a jump cannot start on " + from);  // never on the last square
            if (to < 1 || to > size || to == from) throw new IllegalArgumentException("bad jump " + from + " -> " + to);
            if (jumps.containsKey(to)) throw new IllegalArgumentException(from + " lands on the start of another jump");  // no chains, so no cycles
        }
        this.size = size;
        this.jumps = Map.copyOf(jumps);
    }

    int size() { return size; }
    int land(int square) { return jumps.getOrDefault(square, square); }

    Event kindAt(int square) {
        Integer to = jumps.get(square);
        return to == null ? Event.MOVE : to > square ? Event.LADDER : Event.SNAKE;
    }
}

// Strategy 1: where the roll comes from. The game never knows if it is random.
interface Dice {
    int roll();
}

final class RandomDice implements Dice {
    private final DoubleSupplier rng;  // injected, so a test can seed it
    private final int sides;

    RandomDice(DoubleSupplier rng, int sides) {
        this.rng = rng;
        this.sides = sides;
    }

    @Override public int roll() { return 1 + (int) (rng.getAsDouble() * sides); }
}

final class FixedDice implements Dice {  // for tests and demos: the same rolls, in order, then again
    private final int[] rolls;
    private int next;

    FixedDice(int... rolls) { this.rolls = rolls.clone(); }

    @Override public int roll() { return rolls[next++ % rolls.length]; }
}

// Strategy 2: how the last square is reached. A rule maps (position, roll, size) to a square, or empty if the move is refused.
interface Rule {
    OptionalInt apply(int pos, int roll, int size);

    Rule EXACT = (pos, roll, size) -> pos + roll > size ? OptionalInt.empty() : OptionalInt.of(pos + roll);  // must land on the last square
    Rule FINISH = (pos, roll, size) -> OptionalInt.of(Math.min(pos + roll, size));                         // any roll that reaches it wins
    Rule BOUNCE = (pos, roll, size) -> {                                                                   // the extra steps walk back
        int target = pos + roll;
        return OptionalInt.of(target > size ? size - (target - size) : target);
    };
}
