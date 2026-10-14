import java.util.Arrays;

// Edit the inputs and run. pairSum and removeDuplicates are the templates above.
public class TryIt {
    public static void main(String[] args) {
        System.out.println(Arrays.toString(OppositeEnds.pairSum(new int[] {1, 3, 4, 6, 8, 11}, 10)));   // [2, 3]
        System.out.println(Arrays.toString(OppositeEnds.pairSum(new int[] {2, 4, 5, 9}, 12)));          // [-1, -1]

        int[] nums = {0, 0, 1, 1, 1, 2, 2, 3, 3, 4};
        int k = ReadWrite.removeDuplicates(nums);
        System.out.println(k + " " + Arrays.toString(Arrays.copyOf(nums, k)));                          // 5 [0, 1, 2, 3, 4]
    }
}
