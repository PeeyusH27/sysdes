final class TryIt {
    public static void main(String[] args) {
        // Edit the trees (level order, null = missing child) and run. The methods are the templates above.
        TreeNode root = Trees.fromArray(8, 3, 10, 1, 6, null, 14, null, null, 4, 7);
        System.out.println(Orders.traversals(root));                                          // Result[pre=[8, 3, 1, 6, 4, 7, 10, 14], inorder=[1, 3, 4, 6, 7, 8, 10, 14], post=[1, 4, 7, 6, 3, 14, 10, 8]]
        System.out.println(ReturnUp.height(root));                                            // 4
        System.out.println(CarryDown.goodNodes(Trees.fromArray(5, 3, 8, 6, 2, 7, 9)));        // 4
        System.out.println(GlobalBest.longestUnivaluePath(Trees.fromArray(1, 4, 5, 4, 4, 5))); // 2
        System.out.println(Iterative.inorderIterative(Trees.fromArray(6, 3, 9, 1, 4, 8, 10))); // [1, 3, 4, 6, 8, 9, 10]
    }
}
