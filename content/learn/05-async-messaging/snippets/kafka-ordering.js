// @display-only: needs a Kafka cluster and an `applyIdempotently` handler
// Same key → same partition → ordered per user
// (KafkaJS API shown; Confluent's @confluentinc/kafka-javascript offers a KafkaJS-compatible API)
import { Kafka } from 'kafkajs';
const kafka = new Kafka({ clientId: 'orders', brokers: ['localhost:9092'] });

const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });   // broker drops duplicate retries
await producer.connect();

export async function publishOrderEvent(order, event) {
  await producer.send({
    topic: 'order-events',
    messages: [{ key: String(order.userId), value: JSON.stringify(event) }],     // the key picks the partition
  });
}

const consumer = kafka.consumer({ groupId: 'billing' });     // every group gets every event
await consumer.connect();
await consumer.subscribe({ topic: 'order-events' });
await consumer.run({
  eachMessage: async ({ message }) => {
    await applyIdempotently(JSON.parse(message.value.toString()));   // the offset is committed after this resolves
  },
});
