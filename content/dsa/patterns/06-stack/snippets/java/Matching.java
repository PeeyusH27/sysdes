import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;

// Template 1: matching and nesting. Push what is still open; a closer must match the most recent open item.
public final class Matching {
    private Matching() {}

    private static final Map<Character, Character> PAIRS = Map.of(')', '(', ']', '[', '}', '{');

    public static boolean isBalanced(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char ch : s.toCharArray()) {
            if (PAIRS.containsKey(ch)) {
                Character open = stack.poll();   // null when nothing is open
                if (open == null || !open.equals(PAIRS.get(ch))) return false;
            } else {
                stack.push(ch);
            }
        }
        return stack.isEmpty();   // anything left was never closed
    }

    // The same shape handles "undo the most recent": ".." cancels the latest directory.
    public static String simplifyPath(String path) {
        Deque<String> stack = new ArrayDeque<>();
        for (String part : path.split("/")) {
            if (part.equals("..")) stack.poll();   // poll, not pop: a no-op when the stack is empty
            else if (!part.isEmpty() && !part.equals(".")) stack.push(part);
        }
        // push() adds at the front, so the oldest directory is last: join from the back.
        StringBuilder sb = new StringBuilder();
        for (var it = stack.descendingIterator(); it.hasNext(); ) sb.append('/').append(it.next());
        return sb.length() == 0 ? "/" : sb.toString();
    }
}
