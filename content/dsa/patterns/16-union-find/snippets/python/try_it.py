from union_find import UnionFind  # @hide
from count_groups import count_groups  # @hide
from cycle_edge import first_cycle_edge  # @hide
from keyed_union_find import KeyedUnionFind  # @hide
# Edit the inputs and press Run. The classes and functions are the templates above.
uf = UnionFind(6)
uf.union(0, 1)
uf.union(2, 3)
uf.union(1, 3)                                       # two rank-1 trees: 2 goes under 0
print(uf.connected(0, 2), uf.connected(0, 4))        # True False
print(uf.count)                                      # 3
print(uf.parent)                                     # [0, 0, 0, 2, 4, 5]
uf.find(3)                                           # walks 3 -> 2 -> 0 and re-points 3 at the root
print(uf.parent)                                     # [0, 0, 0, 0, 4, 5]

print(count_groups(5, [(0, 1), (1, 2), (3, 4)]))                 # 2
print(first_cycle_edge(4, [(0, 1), (1, 2), (2, 3), (3, 1)]))     # [3, 1]

emails = KeyedUnionFind()
emails.union("ana@x.com", "ana@work.com")
emails.union("ana@work.com", "a.dev@z.com")
print(emails.size_of("a.dev@z.com"))                 # 3
