import java.util.ArrayDeque;
import java.util.Deque;

// Template 4: monotonic deque. Holds indices whose values DECREASE from front to back, so the front is
// always the maximum of the current window. Every index is pushed once and popped once: O(n) overall.
public final class WindowMax {
    private WindowMax() {}

    public static int[] windowMax(int[] nums, int k) {
        Deque<Integer> dq = new ArrayDeque<>();   // indices; O(1) at both ends, so no moving head is needed
        int[] out = new int[Math.max(0, nums.length - k + 1)];
        for (int i = 0; i < nums.length; i++) {
            if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();                 // front index slid out
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();        // can never be a max again
            dq.addLast(i);
            if (i >= k - 1) out[i - k + 1] = nums[dq.peekFirst()];                        // window [i - k + 1, i] is full
        }
        return out;
    }
}
