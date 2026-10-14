from __future__ import annotations


# Wildcard search on a trie (built with the Trie template): '.' matches any one character.
# A letter follows a single edge; a dot branches into every child. A branch that breaks off dies at once.
def matches_pattern(trie: Trie, pattern: str) -> bool:
    def dfs(node: TrieNode, i: int) -> bool:
        if i == len(pattern):
            return node.is_end  # used up the pattern: is this a whole word?
        ch = pattern[i]
        if ch != ".":
            child = node.children.get(ch)
            return child is not None and dfs(child, i + 1)
        for child in node.children.values():
            if dfs(child, i + 1):
                return True  # stop at the first branch that matches
        return False

    return dfs(trie.root, 0)
