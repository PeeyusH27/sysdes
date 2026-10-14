// Wildcard search on a trie (built with the Trie template): '.' matches any one character.
// A letter follows a single edge; a dot branches into every child. A branch that breaks off dies at once.
final class Wildcard {
    private Wildcard() {}

    static boolean matchesPattern(Trie trie, String pattern) {
        return dfs(trie.root, pattern, 0);
    }

    private static boolean dfs(TrieNode node, String pattern, int i) {
        if (i == pattern.length()) return node.isEnd; // used up the pattern: is this a whole word?
        char ch = pattern.charAt(i);
        if (ch != '.') {
            TrieNode child = node.children.get(ch);
            return child != null && dfs(child, pattern, i + 1);
        }
        for (TrieNode child : node.children.values()) {
            if (dfs(child, pattern, i + 1)) return true; // stop at the first branch that matches
        }
        return false;
    }
}
