"""Run from this folder:  python3 -m unittest discover -p "test_*.py" """
import unittest

from scan import find_all_matches
from trie import Trie
from trie_array import ArrayTrie
from wildcard import matches_pattern


class TrieTest(unittest.TestCase):
    def test_search_needs_a_whole_word_starts_with_any_prefix(self):
        t = Trie()
        for w in ["car", "cat", "cart", "dog"]:
            t.insert(w)
        self.assertTrue(t.search("car"))
        self.assertTrue(t.search("cart"))
        self.assertFalse(t.search("ca"))
        self.assertTrue(t.starts_with("ca"))
        self.assertFalse(t.search("cow"))
        self.assertFalse(t.starts_with("cow"))
        self.assertTrue(t.starts_with(""))

    def test_words_with_prefix_lists_completions(self):
        t = Trie()
        for w in ["car", "cat", "cart", "dog", "do"]:
            t.insert(w)
        self.assertEqual(sorted(t.words_with_prefix("ca")), ["car", "cart", "cat"])
        self.assertEqual(sorted(t.words_with_prefix("do")), ["do", "dog"])
        self.assertEqual(t.words_with_prefix("x"), [])


class ArrayTrieTest(unittest.TestCase):
    def test_array_of_26_trie_stores_and_finds_words(self):
        t = ArrayTrie()
        for w in ["apple", "app", "zebra"]:
            t.insert(w)
        self.assertTrue(t.search("app"))
        self.assertTrue(t.search("apple"))
        self.assertFalse(t.search("appl"))
        self.assertFalse(t.search("zeb"))
        self.assertTrue(t.search("zebra"))
        self.assertFalse(t.search("b"))


class WildcardTest(unittest.TestCase):
    def setUp(self):
        self.trie = Trie()
        for w in ["bad", "bed", "cat", "cot"]:
            self.trie.insert(w)

    def test_dots_match_any_single_character(self):
        for p in [".at", "b.d", "c.t", "..."]:
            self.assertTrue(matches_pattern(self.trie, p), p)

    def test_length_and_whole_word_rules_still_apply(self):
        for p in ["b.t", "..", "....", "x.."]:
            self.assertFalse(matches_pattern(self.trie, p), p)


class ScanTest(unittest.TestCase):
    def test_finds_overlapping_dictionary_words(self):
        trie = Trie()
        for w in ["he", "her", "hers", "she"]:
            trie.insert(w)
        self.assertEqual(find_all_matches("ushers", trie), [(1, "she"), (2, "he"), (2, "her"), (2, "hers")])

    def test_no_matches_and_empty_text(self):
        trie = Trie()
        trie.insert("cat")
        self.assertEqual(find_all_matches("dog", trie), [])
        self.assertEqual(find_all_matches("", trie), [])
        self.assertEqual(find_all_matches("catcat", trie), [(0, "cat"), (3, "cat")])


if __name__ == "__main__":
    unittest.main()
