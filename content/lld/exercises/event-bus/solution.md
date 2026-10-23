This is Observer with a topic router. Two decisions keep it small: store subscriptions per subscriber, and treat a pattern as data you can test against a topic.

1. **Separate the three concerns.** Subscribers (who), patterns (what they want) and delivery (what they got) are different things, so keep `subs` (id → patterns) and `boxes` (id → received events) apart.
2. **Make matching a pure function.** `matches(pattern, topic)` is true for an exact match, or when the pattern ends in `.*` and the topic starts with the pattern minus its `*`. Keeping the dot in the prefix is what stops `"orders.*"` from matching `"orders"` or `"ordersX"`.
3. **Deduplicate per subscriber, not per pattern.** `publish` walks subscribers and asks whether any of their patterns match. Looping over patterns instead would deliver twice to someone holding both `"orders.*"` and `"orders.created"`.
4. **Count subscribers, not deliveries.** The return value is the number of subscribers that received the event, which is the number of `boxes` that grew.
5. **Return copies from `inbox`.** Handing out the internal array lets a caller change history. A shallow copy is enough here.

The design bends in the right places: a new kind of pattern (a suffix, a regex) touches only `matches`, and a new way to deliver (a callback, a queue) touches only the line that appends to the box. With callbacks, `boxes` would hold functions instead of arrays and `publish` would call them, and the publisher would still not know who is listening.

Cost: `publish` is O(subscribers × patterns). Past thousands of subscribers you would index exact topics in a map and keep a trie of wildcard prefixes, which is the same idea as the Trie pattern.
