import java.util.Arrays;
import java.util.PriorityQueue;

final class RoomsHeap {
    // Template 2b: rooms needed for half-open meetings. Take meetings by start; the heap holds the end time of each
    // busy room, so its top is the room that frees up first. Reuse it if it is free, otherwise open a new room.
    // (PriorityQueue is Java's built-in binary min-heap, so there is no hand-written MinHeap as in the JavaScript.)
    static int minRooms(int[][] intervals) {
        int[][] sorted = intervals.clone();
        Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> ends = new PriorityQueue<>();
        for (int[] interval : sorted) {
            int start = interval[0];
            int end = interval[1];
            if (!ends.isEmpty() && ends.peek() <= start) ends.poll(); // that room is free again: hand it over
            ends.add(end);
        }
        return ends.size();
    }
}
