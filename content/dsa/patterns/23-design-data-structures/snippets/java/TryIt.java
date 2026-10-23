// Edit the calls and run. These are the templates above.
public class TryIt {
    public static void main(String[] args) {
        LruCache lru = new LruCache(2);
        lru.put(1, 1);
        lru.put(2, 2);
        lru.get(1);
        lru.put(3, 3);   // evicts key 2
        System.out.println(lru.get(2) + " " + lru.get(1) + " " + lru.get(3));   // -1 1 3

        LfuCache lfu = new LfuCache(2);
        lfu.put(1, 1);
        lfu.put(2, 2);
        lfu.get(1);
        lfu.put(3, 3);   // evicts key 2: fewest uses
        System.out.println(lfu.get(2) + " " + lfu.get(1) + " " + lfu.get(3));   // -1 1 3

        TimeMap tm = new TimeMap();
        tm.set("love", "high", 10);
        tm.set("love", "low", 20);
        StringBuilder sb = new StringBuilder();
        for (int t : new int[] {5, 10, 15, 20}) {
            String v = tm.get("love", t);
            sb.append(sb.length() == 0 ? "" : " ").append(v.isEmpty() ? "(none)" : v);
        }
        System.out.println(sb);   // (none) high high low

        RandomizedSet set = new RandomizedSet();
        System.out.println(set.insert(5) + " " + set.insert(5) + " " + set.remove(7) + " " + set.remove(5) + " " + set.insert(9) + " " + set.getRandom());   // true false false true true 9

        MinMaxStack st = new MinMaxStack();
        for (int v : new int[] {3, 5, 2}) st.push(v);
        System.out.println(st.getMin() + " " + st.getMax());   // 2 5
        st.pop();
        System.out.println(st.getMin() + " " + st.getMax());   // 3 5
    }
}
