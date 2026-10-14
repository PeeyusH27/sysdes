from trees import from_array  # @hide
from orders import traversals  # @hide
from return_up import height  # @hide
from carry_down import good_nodes  # @hide
from global_best import longest_univalue_path  # @hide
from iterative import inorder_iterative  # @hide
# Edit the trees (level order, None = missing child) and press Run. The functions are the templates above.
root = from_array([8, 3, 10, 1, 6, None, 14, None, None, 4, 7])
print(traversals(root))                                       # Orders(pre=[8, 3, 1, 6, 4, 7, 10, 14], inorder=[1, 3, 4, 6, 7, 8, 10, 14], post=[1, 4, 7, 6, 3, 14, 10, 8])
print(height(root))                                           # 4
print(good_nodes(from_array([5, 3, 8, 6, 2, 7, 9])))          # 4
print(longest_univalue_path(from_array([1, 4, 5, 4, 4, 5])))  # 2
print(inorder_iterative(from_array([6, 3, 9, 1, 4, 8, 10])))  # [1, 3, 4, 6, 8, 9, 10]
