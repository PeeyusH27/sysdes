from trie import Trie  # @hide
from wildcard import matches_pattern  # @hide
from scan import find_all_matches  # @hide
# Add words and queries, then press Run. Trie, matches_pattern and find_all_matches are the templates above.
trie = Trie()
for word in ["car", "cart", "cat", "care", "dog"]:
    trie.insert(word)

print(trie.search("car"), trie.search("ca"), trie.starts_with("ca"))  # True False True
print(trie.words_with_prefix("car"))                                  # ['car', 'cart', 'care']
print(matches_pattern(trie, "c.t"), matches_pattern(trie, ".o."))     # True True
print(matches_pattern(trie, "ca.."), matches_pattern(trie, "d..s"))  # True False
print(find_all_matches("scatdogcare", trie))  # [(1, 'cat'), (4, 'dog'), (7, 'car'), (7, 'care')]
