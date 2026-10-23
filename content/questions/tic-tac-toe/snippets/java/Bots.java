import java.util.*;

// Strategy: a bot is a function (board, mark) -> cell. The game never knows which one is playing.
interface Bot {
    int[] choose(Board board, Mark mark);
}

final class Bots {
    static List<int[]> free(Board board) {
        List<int[]> cells = new ArrayList<>();
        for (int r = 0; r < board.size(); r++) {
            for (int c = 0; c < board.size(); c++) if (board.isFree(r, c)) cells.add(new int[] {r, c});
        }
        return cells;
    }

    static final Bot FIRST_FREE = (board, mark) -> free(board).get(0);

    // Win if you can, else block the opponent, else take the middle, else the first free cell.
    static final Bot SENSIBLE = (board, mark) -> {
        List<int[]> cells = free(board);
        int mid = board.size() / 2;
        for (int[] cell : cells) if (board.wouldComplete(mark, cell[0], cell[1])) return cell;
        for (int[] cell : cells) if (board.wouldComplete(mark.other(), cell[0], cell[1])) return cell;
        for (int[] cell : cells) if (cell[0] == mid && cell[1] == mid) return cell;
        return cells.get(0);
    };

    private Bots() {}
}
