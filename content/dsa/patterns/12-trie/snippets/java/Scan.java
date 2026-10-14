import java.util.*;

// Pruned search: from each start position, walk the trie while reading the text, and stop the moment no stored
// word continues that way. Finds every dictionary word that appears in text, as (start, word) pairs.
final class Scan {
    private Scan() {}

    record Match(int start, String word) {}

    static List<Match> findAllMatches(String text, Trie trie) {
        List<Match> found = new ArrayList<>();
        for (int start = 0; start < text.length(); start++) {
            TrieNode node = trie.root;
            for (int end = start; end < text.length(); end++) {
                node = node.children.get(text.charAt(end));
                if (node == null) break;                       // dead end: no word has this prefix, so stop early
                if (node.isEnd) found.add(new Match(start, text.substring(start, end + 1)));
            }
        }
        return found;
    }
}
