import unittest

from two_strings import lcs_string


def is_subsequence(t, s):
    k = 0
    for ch in s:
        if k < len(t) and ch == t[k]:
            k += 1
    return k == len(t)


class TwoStringsTest(unittest.TestCase):
    def test_rebuilds_a_longest_common_subsequence(self):
        self.assertEqual(lcs_string("CLOUD", "COLD"), "CLD")
        self.assertEqual(lcs_string("abc", "abc"), "abc")
        s = lcs_string("bdcaba", "abcbdab")
        self.assertEqual(len(s), 4)
        self.assertTrue(is_subsequence(s, "bdcaba") and is_subsequence(s, "abcbdab"))

    def test_returns_the_empty_string_when_nothing_is_shared(self):
        self.assertEqual(lcs_string("abc", "xyz"), "")
        self.assertEqual(lcs_string("", "abc"), "")
        self.assertEqual(lcs_string("", ""), "")


if __name__ == "__main__":
    unittest.main()
