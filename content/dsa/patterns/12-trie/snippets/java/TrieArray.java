// The same trie with a fixed array of 26 children per node, for lowercase 'a' to 'z' only.
// No hashing, so it is fast and predictable; but every node pays for 26 slots even if it uses one.
class ArrayNode {
    final ArrayNode[] next = new ArrayNode[26]; // all null until a child is created
    boolean isEnd = false;
}

class ArrayTrie {
    final ArrayNode root = new ArrayNode();

    void insert(String word) {
        ArrayNode node = root;
        for (int i = 0; i < word.length(); i++) {
            int c = word.charAt(i) - 'a'; // 'a' -> 0, 'b' -> 1, ... 'z' -> 25
            if (node.next[c] == null) node.next[c] = new ArrayNode();
            node = node.next[c];
        }
        node.isEnd = true;
    }

    boolean search(String word) {
        ArrayNode node = root;
        for (int i = 0; i < word.length() && node != null; i++) node = node.next[word.charAt(i) - 'a'];
        return node != null && node.isEnd;
    }
}
