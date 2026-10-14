// Add words and queries, then run main. Trie, Wildcard and Scan are the templates above.
public class TryIt {
    public static void main(String[] args) {
        Trie trie = new Trie();
        for (String word : new String[] {"car", "cart", "cat", "care", "dog"}) trie.insert(word);

        System.out.println(trie.search("car") + " " + trie.search("ca") + " " + trie.startsWith("ca")); // true false true
        System.out.println(trie.wordsWithPrefix("car"));                                                // [car, cart, care]
        System.out.println(Wildcard.matchesPattern(trie, "c.t") + " " + Wildcard.matchesPattern(trie, ".o.")); // true true
        System.out.println(Wildcard.matchesPattern(trie, "ca..") + " " + Wildcard.matchesPattern(trie, "d..s")); // true false
        System.out.println(Scan.findAllMatches("scatdogcare", trie)); // [Match[start=1, word=cat], ...]
    }
}
