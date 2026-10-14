from __future__ import annotations

from typing import List, Tuple


# Pruned search: from each start position, walk the trie while reading the text, and stop the moment no stored
# word continues that way. Finds every dictionary word that appears in text, as (start, word) pairs.
def find_all_matches(text: str, trie: Trie) -> List[Tuple[int, str]]:
    found: List[Tuple[int, str]] = []
    for start in range(len(text)):
        node = trie.root
        for end in range(start, len(text)):
            node = node.children.get(text[end])
            if node is None:
                break  # dead end: no word has this prefix, so stop early
            if node.is_end:
                found.append((start, text[start:end + 1]))
    return found
