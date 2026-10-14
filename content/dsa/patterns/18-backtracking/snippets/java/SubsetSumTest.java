import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

final class SubsetSumTest {
    static List<List<Integer>> list(Integer[]... groups) {
        List<List<Integer>> out = new ArrayList<>();
        for (Integer[] g : groups) out.add(List.of(g));
        return out;
    }

    public static void main(String[] args) {
        Check.test("finds every group that hits the target", () -> {
            Check.eq(list(new Integer[] {1, 4}, new Integer[] {2, 3}), SubsetSum.subsetsWithSum(new int[] {4, 1, 3, 2}, 5));
            Check.eq(list(new Integer[] {2, 3, 5}, new Integer[] {2, 8}), SubsetSum.subsetsWithSum(new int[] {2, 3, 5, 6, 8}, 10));
        });

        Check.test("no answer, exact single value, target of everything", () -> {
            Check.eq(list(), SubsetSum.subsetsWithSum(new int[] {5, 6}, 4));
            Check.eq(list(new Integer[] {7}), SubsetSum.subsetsWithSum(new int[] {7, 3}, 7));
            Check.eq(list(new Integer[] {1, 2, 3}), SubsetSum.subsetsWithSum(new int[] {1, 2, 3}, 6));
        });

        Check.test("agrees with checking every subset", () -> {
            int[] nums = {3, 9, 1, 7, 4, 6, 2};
            List<String> brute = new ArrayList<>();
            for (int mask = 0; mask < 1 << nums.length; mask++) {
                List<Integer> pick = new ArrayList<>();
                for (int i = 0; i < nums.length; i++) if ((mask & (1 << i)) != 0) pick.add(nums[i]);
                Collections.sort(pick);
                if (pick.stream().mapToInt(Integer::intValue).sum() == 13) brute.add(pick.toString());
            }
            Collections.sort(brute);
            List<String> got = SubsetSum.subsetsWithSum(nums, 13).stream().map(Object::toString).sorted().collect(Collectors.toList());
            Check.eq(brute, got);
        });

        Check.finish();
    }
}
