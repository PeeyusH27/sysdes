class EventBus {
  constructor() {
    
  }

  /** Subscribe `id` to a topic pattern: an exact topic ("orders.created") or a prefix wildcard ("orders.*"). */
  subscribe(pattern, id) {
    
  }

  /** Remove one subscription. @return {boolean} true if it existed */
  unsubscribe(pattern, id) {
    
  }

  /** Deliver the message to every subscriber with a matching pattern. @return {number} how many subscribers received it */
  publish(topic, message) {
    
  }

  /** @return {Array<[string, string]>} everything `id` has received, as [topic, message], oldest first */
  inbox(id) {
    
  }
}
