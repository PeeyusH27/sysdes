import java.util.ArrayList;
import java.util.List;

// A queue on top of a list and a head index. push() is O(1) and so is shift() here: it only moves head.
// ArrayList.remove(0) moves every remaining element down one slot, so a big BFS that uses it is O(n^2).
// (In real code ArrayDeque does this for you; this shows what it saves you from.)
final class ArrayQueue<T> {
    private List<T> items = new ArrayList<>();
    private int head = 0;

    void push(T item) {
        items.add(item);
    }

    // The oldest item, or null when the queue is empty.
    T shift() {
        if (head == items.size()) return null;
        T item = items.get(head++);
        if (head > 1024 && head * 2 > items.size()) {
            items = new ArrayList<>(items.subList(head, items.size())); // now and then, drop the used prefix to free memory
            head = 0;
        }
        return item;
    }

    int size() {
        return items.size() - head;
    }
}
