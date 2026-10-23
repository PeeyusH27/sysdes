import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

final class Game {
    private final Board board;
    private final List<String> players;
    private final Dice dice;
    private final Rule rule;
    private final boolean sixAgain;
    private final Map<String, Integer> position = new HashMap<>();  // 0 means "not on the board yet"
    private final List<Consumer<MoveResult>> listeners = new CopyOnWriteArrayList<>();
    private int turn;  // index into players
    private String winner;

    Game(Board board, List<String> players, Dice dice, Rule rule, boolean sixAgain) {
        this.board = board;
        this.players = List.copyOf(players);
        this.dice = dice;
        this.rule = rule;
        this.sixAgain = sixAgain;
        for (String p : players) position.put(p, 0);
    }

    void on(Consumer<MoveResult> listener) { listeners.add(listener); }  // observer: a UI, a log or a test

    // One game is one monitor: two threads rolling "at once" take turns, and different games never wait for each other.
    synchronized int position(String player) { return position.get(player); }
    synchronized Optional<String> winner() { return Optional.ofNullable(winner); }
    synchronized void place(String player, int square) { position.put(player, square); }  // set-up for tests and saved games

    // One roll by whoever is next. Empty once someone has won.
    synchronized Optional<MoveResult> play() {
        if (winner != null) return Optional.empty();
        String player = players.get(turn);
        int roll = dice.roll();
        int from = position.get(player);
        OptionalInt landed = rule.apply(from, roll, board.size());
        int to = landed.isPresent() ? board.land(landed.getAsInt()) : from;
        Event event = landed.isPresent() ? board.kindAt(landed.getAsInt()) : Event.STAY;
        if (to == board.size()) {
            event = Event.WIN;
            winner = player;
        }
        position.put(player, to);
        if (winner == null && !(roll == 6 && sixAgain)) turn = (turn + 1) % players.size();
        MoveResult result = new MoveResult(player, roll, from, to, event);
        listeners.forEach(l -> l.accept(result));
        return Optional.of(result);
    }
}
