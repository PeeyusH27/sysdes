from lru_cache import LRUCache  # @hide
from lfu_cache import LFUCache  # @hide
from time_map import TimeMap  # @hide
from randomized_set import RandomizedSet  # @hide
from min_max_stack import MinMaxStack  # @hide
# Edit the calls and press Run. These are the templates above.
lru = LRUCache(2)
lru.put(1, 1)
lru.put(2, 2)
lru.get(1)
lru.put(3, 3)   # evicts key 2
print(lru.get(2), lru.get(1), lru.get(3))   # -1 1 3

lfu = LFUCache(2)
lfu.put(1, 1)
lfu.put(2, 2)
lfu.get(1)
lfu.put(3, 3)   # evicts key 2: fewest uses
print(lfu.get(2), lfu.get(1), lfu.get(3))   # -1 1 3

tm = TimeMap()
tm.set("love", "high", 10)
tm.set("love", "low", 20)
print(" ".join(tm.get("love", t) or "(none)" for t in (5, 10, 15, 20)))   # (none) high high low

rs = RandomizedSet()
print(rs.insert(5), rs.insert(5), rs.remove(7), rs.remove(5), rs.insert(9), rs.get_random())   # True False False True True 9

st = MinMaxStack()
for v in (3, 5, 2):
    st.push(v)
print(st.get_min(), st.get_max())   # 2 5
st.pop()
print(st.get_min(), st.get_max())   # 3 5
