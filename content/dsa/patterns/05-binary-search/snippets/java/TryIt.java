// Edit the inputs and run. The functions are the templates above.
public class TryIt {
    public static void main(String[] args) {
        int[] nums = {1, 3, 3, 3, 5, 8, 9};
        System.out.println(Classic.binarySearch(nums, 8));                                      // 5
        System.out.println(Classic.binarySearch(nums, 4));                                      // -1
        System.out.println(LowerBound.lowerBound(nums, 3) + " " + LowerBound.upperBound(nums, 3)); // 1 4  (the 3s fill indices 1 to 3)
        System.out.println(LowerBound.upperBound(nums, 3) - LowerBound.lowerBound(nums, 3));     // 3    (how many 3s)
        System.out.println(LowerBound.lowerBound(nums, 4));                                     // 4    (where 4 would be inserted)

        System.out.println(AnswerSpace.shipWithinDays(new int[] {4, 2, 3, 1, 2}, 3));           // 5
    }
}
