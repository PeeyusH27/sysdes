import java.util.*;

// Strategy: the cache owns the data, the policy owns the order. A policy answers one question: who goes next?
interface EvictionPolicy<K> {
    void onInsert(K key);
    void onAccess(K key);
    void onRemove(K key);
    K victim();  // null when empty
}

final class LruPolicy<K> implements EvictionPolicy<K> {
    private static final class Node<T> {
        final T key;
        Node<T> prev;
        Node<T> next;

        Node(T key) { this.key = key; }
    }

    private final Map<K, Node<K>> nodes = new HashMap<>();  // key -> node, so any key is found in O(1)
    private final Node<K> head = new Node<>(null);          // sentinels: the ends need no null checks
    private final Node<K> tail = new Node<>(null);

    LruPolicy() {
        head.next = tail;
        tail.prev = head;
    }

    private void unlink(Node<K> n) { n.prev.next = n.next; n.next.prev = n.prev; }

    private void pushFront(Node<K> n) {
        n.next = head.next;
        n.prev = head;
        head.next.prev = n;
        head.next = n;
    }

    @Override public void onInsert(K key) {
        Node<K> n = new Node<>(key);
        nodes.put(key, n);
        pushFront(n);
    }

    @Override public void onAccess(K key) {  // newest to the front
        Node<K> n = nodes.get(key);
        unlink(n);
        pushFront(n);
    }

    @Override public void onRemove(K key) { unlink(nodes.remove(key)); }

    @Override public K victim() { return tail.prev == head ? null : tail.prev.key; }  // the back is the oldest
}

final class FifoPolicy<K> implements EvictionPolicy<K> {
    private final LinkedHashSet<K> order = new LinkedHashSet<>();

    @Override public void onInsert(K key) { order.add(key); }
    @Override public void onAccess(K key) {}  // reads do not change who is next
    @Override public void onRemove(K key) { order.remove(key); }
    @Override public K victim() { return order.isEmpty() ? null : order.iterator().next(); }
}
