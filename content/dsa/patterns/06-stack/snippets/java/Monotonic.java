import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

// Templates 2 and 3: monotonic stacks.
public final class Monotonic {
    private Monotonic() {}

    // Template 2: monotonic decreasing stack. For each index, the index of the first strictly greater value to its
    // right, or -1. The stack holds indices still waiting for an answer; their values never rise from bottom to top.
    public static int[] nextGreaterIndex(int[] nums) {
        int[] answer = new int[nums.length];
        Arrays.fill(answer, -1);
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < nums.length; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
                answer[stack.pop()] = i;   // nums[i] resolves every smaller value waiting on top
            }
            stack.push(i);
        }
        return answer;
    }

    /** The JavaScript version returns { left, right }; a record is the Java equivalent. */
    public record Neighbours(int[] left, int[] right) {}

    // Template 3: monotonic increasing stack. right[i] is the first index to the right with a smaller value (n if none);
    // left[i] is the nearest index to the left with a value that is not larger (-1 if none).
    // Each pop resolves the popped index's right side; the top left after popping is the current index's left side.
    public static Neighbours smallerNeighbours(int[] nums) {
        int n = nums.length;
        int[] left = new int[n];
        int[] right = new int[n];
        Arrays.fill(left, -1);
        Arrays.fill(right, n);
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] > nums[i]) {
                right[stack.pop()] = i;
            }
            left[i] = stack.isEmpty() ? -1 : stack.peek();
            stack.push(i);
        }
        return new Neighbours(left, right);
    }
}
