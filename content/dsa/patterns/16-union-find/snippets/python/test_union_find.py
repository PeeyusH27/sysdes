"""Run from this folder:  python3 -m unittest discover -p "test_*.py" """
import unittest

from count_groups import count_groups, groups_of
from cycle_edge import first_cycle_edge, is_tree
from keyed_union_find import KeyedUnionFind
from union_find import UnionFind


class UnionFindTest(unittest.TestCase):
    def test_union_merges_groups_and_count_goes_down_once_per_merge(self):
        uf = UnionFind(6)
        self.assertEqual(uf.count, 6)
        self.assertTrue(uf.union(0, 1))
        self.assertTrue(uf.union(2, 3))
        self.assertTrue(uf.union(1, 3))
        self.assertEqual(uf.count, 3)
        self.assertTrue(uf.connected(0, 2))
        self.assertFalse(uf.connected(0, 4))

    def test_union_returns_false_when_both_items_already_share_a_root(self):
        uf = UnionFind(3)
        uf.union(0, 1)
        uf.union(1, 2)
        self.assertFalse(uf.union(2, 0))
        self.assertFalse(uf.union(1, 1))
        self.assertEqual(uf.count, 1)

    def test_union_by_rank_hangs_the_shorter_tree_under_the_taller_one(self):
        uf = UnionFind(5)
        uf.union(0, 1)  # rank[0] = 1
        uf.union(0, 2)  # 2 joins under 0, rank stays 1
        self.assertEqual(uf.rank[0], 1)
        uf.union(3, 0)  # rank[3] = 0 < rank[0] = 1, so 3 goes under 0
        self.assertEqual(uf.parent[3], 0)
        self.assertEqual(uf.rank[0], 1)

    def test_find_compresses_the_path_it_walks(self):
        uf = UnionFind(5)
        uf.parent = [1, 2, 3, 4, 4]  # a hand-built chain 0 -> 1 -> 2 -> 3 -> 4
        self.assertEqual(uf.find(0), 4)
        self.assertEqual(uf.parent, [4, 4, 4, 4, 4])

    def test_a_single_item_and_an_empty_structure(self):
        one = UnionFind(1)
        self.assertEqual(one.find(0), 0)
        self.assertEqual(one.count, 1)
        self.assertEqual(UnionFind(0).count, 0)


class CountGroupsTest(unittest.TestCase):
    def test_counts_components_including_isolated_items(self):
        self.assertEqual(count_groups(5, [(0, 1), (1, 2), (3, 4)]), 2)
        self.assertEqual(count_groups(6, [(0, 1), (1, 2), (2, 0), (3, 4)]), 3)  # 2-0 closes a loop, 5 is alone
        self.assertEqual(count_groups(4, []), 4)
        self.assertEqual(count_groups(1, []), 1)

    def test_lists_the_members_of_every_group(self):
        groups = sorted(sorted(g) for g in groups_of(6, [(0, 3), (3, 5), (1, 2)]))
        self.assertEqual(groups, [[0, 3, 5], [1, 2], [4]])


class CycleEdgeTest(unittest.TestCase):
    def test_returns_the_edge_that_closes_the_first_cycle(self):
        self.assertEqual(first_cycle_edge(4, [(0, 1), (1, 2), (2, 3), (3, 1)]), [3, 1])
        self.assertEqual(first_cycle_edge(3, [(0, 1), (1, 2), (0, 2)]), [0, 2])

    def test_returns_none_for_a_forest(self):
        self.assertIsNone(first_cycle_edge(5, [(0, 1), (2, 3)]))
        self.assertIsNone(first_cycle_edge(1, []))

    def test_a_tree_needs_n_minus_1_edges_and_no_cycle(self):
        self.assertTrue(is_tree(5, [(0, 1), (0, 2), (0, 3), (1, 4)]))
        self.assertFalse(is_tree(4, [(0, 1), (1, 2), (2, 0)]))  # right count, but a cycle and a lonely node
        self.assertFalse(is_tree(4, [(0, 1), (2, 3)]))          # no cycle, but two pieces
        self.assertTrue(is_tree(1, []))


class KeyedUnionFindTest(unittest.TestCase):
    def test_groups_string_keys_and_tracks_group_sizes(self):
        uf = KeyedUnionFind()
        uf.union("ana@x.com", "ana@work.com")
        uf.union("ana@work.com", "a.dev@z.com")
        uf.union("ben@y.com", "ben@y.com")
        self.assertEqual(uf.find("ana@x.com"), uf.find("a.dev@z.com"))
        self.assertEqual(uf.size_of("ana@x.com"), 3)
        self.assertEqual(uf.size_of("ben@y.com"), 1)
        self.assertFalse(uf.union("a.dev@z.com", "ana@x.com"))
        groups = sorted((sorted(g) for g in uf.groups()), key=lambda g: -len(g))
        self.assertEqual(groups, [["a.dev@z.com", "ana@work.com", "ana@x.com"], ["ben@y.com"]])

    def test_the_smaller_group_joins_the_larger_one(self):
        uf = KeyedUnionFind()
        uf.union("a", "b")
        uf.union("a", "c")  # group of 3 rooted at a
        uf.union("z", "a")  # z (size 1) must go under a (size 3)
        self.assertEqual(uf.find("z"), "a")
        self.assertEqual(uf.size_of("z"), 4)

    def test_works_with_grid_cells_encoded_as_strings(self):
        uf = KeyedUnionFind()
        uf.union("0,0", "0,1")
        uf.union("1,1", "0,1")
        self.assertEqual(uf.size_of("1,1"), 3)
        self.assertEqual(uf.find("2,2"), "2,2")  # unseen keys become their own group


if __name__ == "__main__":
    unittest.main()
