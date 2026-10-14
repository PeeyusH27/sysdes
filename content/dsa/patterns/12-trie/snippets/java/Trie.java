import java.util.*;

// A trie node: one child per next character, plus a flag that says "a word ends here".
class TrieNode {
    final Map<Character, TrieNode> children = new LinkedHashMap<>(); // character -> TrieNode
    boolean isEnd = false;
}

class Trie {
    final TrieNode root = new TrieNode();

    void insert(String word) {
        TrieNode node = root;
        for (char ch : word.toCharArray()) {
            node = node.children.computeIfAbsent(ch, c -> new TrieNode());
        }
        node.isEnd = true; // the path alone doesn't make a word: mark where this one ends
    }

    // The node reached by following prefix from the root, or null if the path breaks off.
    TrieNode find(String prefix) {
        TrieNode node = root;
        for (char ch : prefix.toCharArray()) {
            node = node.children.get(ch);
            if (node == null) return null;
        }
        return node;
    }

    boolean search(String word) {
        TrieNode node = find(word);
        return node != null && node.isEnd; // the path must exist AND end a word
    }

    boolean startsWith(String prefix) {
        return find(prefix) != null;       // any path at all is enough
    }

    // Autocomplete: every stored word that starts with prefix, found by a DFS below the prefix's node.
    List<String> wordsWithPrefix(String prefix) {
        List<String> out = new ArrayList<>();
        TrieNode start = find(prefix);
        if (start != null) dfs(start, prefix, out);
        return out;
    }

    private static void dfs(TrieNode node, String path, List<String> out) {
        if (node.isEnd) out.add(path);
        for (Map.Entry<Character, TrieNode> e : node.children.entrySet()) {
            dfs(e.getValue(), path + e.getKey(), out);
        }
    }
}
