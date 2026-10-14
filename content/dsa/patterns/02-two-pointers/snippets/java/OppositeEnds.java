// Template 1: opposite ends. Works when the input is sorted (or symmetric, like a palindrome):
// the sum or comparison at the two ends tells you which end can never be part of the answer.
public final class OppositeEnds {
    private OppositeEnds() {}

    public static int[] pairSum(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left < right) {
            int sum = nums[left] + nums[right];
            if (sum == target) return new int[] {left, right};
            if (sum < target) left++;   // nums[left] is too small for every remaining partner
            else right--;               // nums[right] is too big for every remaining partner
        }
        return new int[] {-1, -1};
    }
}
