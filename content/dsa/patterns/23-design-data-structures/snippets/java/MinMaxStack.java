import java.util.ArrayDeque;
import java.util.Deque;

// Template 5: auxiliary state. Store, with every pushed value, the answer for "everything below me":
// the entry never changes while it lives, so pop needs no repair. O(1) push, pop, top, min and max.
public final class MinMaxStack {
    private final Deque<int[]> items = new ArrayDeque<>();   // {value, min so far, max so far}

    public void push(int val) {
        int[] top = items.peek();
        if (top == null) items.push(new int[] {val, val, val});
        else items.push(new int[] {val, Math.min(val, top[1]), Math.max(val, top[2])});
    }

    public int pop() {
        return items.pop()[0];
    }

    public int top() {
        return items.peek()[0];
    }

    public int getMin() {
        return items.peek()[1];
    }

    public int getMax() {
        return items.peek()[2];
    }
}
