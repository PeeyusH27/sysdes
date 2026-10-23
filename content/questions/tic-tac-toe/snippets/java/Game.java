import java.util.*;

enum Status { IN_PROGRESS, WON, DRAW }  // undo can take a game back from WON or DRAW

enum MoveResult { OK, WIN, DRAW, NOT_YOUR_TURN, INVALID_MOVE, GAME_OVER, STALE }

// Game knows whose turn it is and how the match ends. Every applied change bumps `version`, so two
// clients that both acted on the same view cannot both succeed. All state changes happen under one
// lock, which is the single writer; the turn check and the cell check are one atomic step.
final class Game {
    private record Played(Mark mark, int row, int col) {}

    private final Board board;
    private final Deque<Played> history = new ArrayDeque<>();  // the undo stack (Command)
    private Mark turn = Mark.X;
    private Status status = Status.IN_PROGRESS;
    private Mark winner;
    private long version;

    Game(int n) { board = new Board(n); }

    Game() { this(3); }

    synchronized Board board() { return board; }
    synchronized Mark current() { return turn; }
    synchronized Status status() { return status; }
    synchronized Optional<Mark> winner() { return Optional.ofNullable(winner); }
    synchronized long version() { return version; }

    synchronized MoveResult move(Mark mark, int r, int c) { return move(mark, r, c, version); }

    synchronized MoveResult move(Mark mark, int r, int c, long seen) {
        if (status != Status.IN_PROGRESS) return MoveResult.GAME_OVER;
        if (seen != version) return MoveResult.STALE;  // the caller decided on an old board
        if (mark != turn) return MoveResult.NOT_YOUR_TURN;
        if (!board.isFree(r, c)) return MoveResult.INVALID_MOVE;
        boolean wins = board.wouldComplete(mark, r, c);
        board.place(mark, r, c);
        history.push(new Played(mark, r, c));
        version++;
        if (wins) {
            status = Status.WON;
            winner = mark;
            return MoveResult.WIN;
        }
        if (board.isFull()) {
            status = Status.DRAW;
            return MoveResult.DRAW;
        }
        turn = mark.other();
        return MoveResult.OK;
    }

    synchronized boolean undo() {
        Played last = history.poll();
        if (last == null) return false;
        board.clear(last.row(), last.col());
        turn = last.mark();
        status = Status.IN_PROGRESS;
        winner = null;
        version++;
        return true;
    }
}
