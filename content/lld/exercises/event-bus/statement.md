Build an in-memory **event bus**. Subscribers register interest in topics, publishers announce events, and the bus delivers each event to everyone who asked, without the publisher knowing who they are. This is the Observer pattern with a router in the middle.

Implement the class `EventBus`:

- `subscribe(pattern, id)`: subscriber `id` wants events whose topic matches `pattern`. A pattern is either an exact topic such as `"orders.created"`, or a prefix wildcard such as `"orders.*"`, which matches every topic that starts with `"orders."`. A subscriber may hold many patterns, and subscribing twice with the same pattern changes nothing.
- `unsubscribe(pattern, id)`: remove that one subscription. Returns `true` if it existed and `false` otherwise.
- `publish(topic, message)`: deliver `message` to every subscriber that has at least one pattern matching `topic`. Returns how many **subscribers** received it. A subscriber whose patterns match twice (for example `"orders.*"` and `"orders.created"`) still receives the message **once**.
- `inbox(id)`: everything `id` has received so far, as `[topic, message]` pairs, oldest first. An unknown subscriber has an empty inbox.

Messages published before a subscription existed are not delivered to it later.

**Notes**

- `"orders.*"` does not match `"orders"` itself, and `"*"` on its own is not a pattern.
- Wildcards apply only at the end. A topic never contains `*`.
- Delivery order inside one `publish` does not matter, only the order within each inbox.
