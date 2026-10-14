from __future__ import annotations

from typing import List, Optional

# The same trie with a fixed list of 26 children per node, for lowercase 'a' to 'z' only.
# No hashing, so it is fast and predictable; but every node pays for 26 slots even if it uses one.
CODE_A = ord("a")


class ArrayNode:
    def __init__(self) -> None:
        self.next: List[Optional[ArrayNode]] = [None] * 26
        self.is_end = False


class ArrayTrie:
    def __init__(self) -> None:
        self.root = ArrayNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            c = ord(ch) - CODE_A  # 'a' -> 0, 'b' -> 1, ... 'z' -> 25
            if node.next[c] is None:
                node.next[c] = ArrayNode()
            node = node.next[c]
        node.is_end = True

    def search(self, word: str) -> bool:
        node: Optional[ArrayNode] = self.root
        for ch in word:
            if node is None:
                break
            node = node.next[ord(ch) - CODE_A]
        return node is not None and node.is_end
