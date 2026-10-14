import java.util.Arrays;

// Edit the inputs and run. These are the templates above.
public class TryIt {
    public static void main(String[] args) {
        System.out.println(Matching.isBalanced("{[()()]}") + " " + Matching.isBalanced("([)]"));   // true false
        System.out.println(Matching.simplifyPath("/home//user/./docs/../pics/"));                   // /home/user/pics

        int[] temps = {5, 2, 3, 1, 6, 4};
        int[] next = Monotonic.nextGreaterIndex(temps);
        System.out.println(Arrays.toString(next));                                                  // [4, 2, 4, 4, -1, -1]
        int[] wait = new int[next.length];
        for (int i = 0; i < next.length; i++) wait[i] = next[i] == -1 ? 0 : next[i] - i;
        System.out.println(Arrays.toString(wait));                                                  // days to wait: [4, 1, 2, 1, 0, 0]

        Monotonic.Neighbours nb = Monotonic.smallerNeighbours(new int[] {4, 6, 5, 2, 7, 3});
        System.out.println(Arrays.toString(nb.left()) + " " + Arrays.toString(nb.right()));         // [-1, 0, 0, -1, 3, 3] [3, 2, 3, 6, 5, 6]
    }
}
