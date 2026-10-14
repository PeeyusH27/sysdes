from two_strings import lcs_string  # @hide
from knapsack import knapsack_01, knapsack_unbounded, knapsack_items  # @hide
# The shared-row trap: [row] * 3 repeats ONE list, so every row is the same list.
shared = [[0] * 4] * 3
shared[0][1] = 7
print(" | ".join(" ".join(map(str, row)) for row in shared))  # 0 7 0 0 | 0 7 0 0 | 0 7 0 0

# A comprehension builds a fresh list per row: independent rows.
table = [[0] * 4 for _ in range(3)]
table[0][1] = 7
print(" | ".join(" ".join(map(str, row)) for row in table))   # 0 7 0 0 | 0 0 0 0 | 0 0 0 0

# Two strings, with the answer rebuilt from the table.
print(lcs_string("CLOUD", "COLD"))                     # CLD

# Same items, two loop directions.
print(knapsack_01([2, 3], [3, 5], 6), knapsack_unbounded([2, 3], [3, 5], 6))  # 8 10
print(knapsack_items([3, 2, 2], [5, 3, 3], 4))          # {'best': 6, 'items': [1, 2]}
