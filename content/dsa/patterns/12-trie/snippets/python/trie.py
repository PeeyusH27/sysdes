from __future__ import annotations

from typing import Dict, List, Optional


# A trie node: one child per next character, plus a flag that says "a word ends here".
class TrieNode:
    def __init__(self) -> None:
        self.children: Dict[str, TrieNode] = {}  # character -> TrieNode
        self.is_end = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True  # the path alone doesn't make a word: mark where this one ends

    # The node reached by following prefix from the root, or None if the path breaks off.
    def find(self, prefix: str) -> Optional[TrieNode]:
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def search(self, word: str) -> bool:
        node = self.find(word)
        return node is not None and node.is_end  # the path must exist AND end a word

    def starts_with(self, prefix: str) -> bool:
        return self.find(prefix) is not None  # any path at all is enough

    # Autocomplete: every stored word that starts with prefix, found by a DFS below the prefix's node.
    def words_with_prefix(self, prefix: str) -> List[str]:
        out: List[str] = []

        def dfs(node: TrieNode, path: str) -> None:
            if node.is_end:
                out.append(path)
            for ch, child in node.children.items():
                dfs(child, path + ch)

        start = self.find(prefix)
        if start is not None:
            dfs(start, prefix)
        return out
